import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DeliveryAddress, User
from ..schemas import DeliveryAddressIn, DeliveryAddressOut
from ..security import current_user

router = APIRouter(prefix="/addresses", tags=["addresses"])
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
CHENNAI_MIN_LAT = 12.75
CHENNAI_MAX_LAT = 13.25
CHENNAI_MIN_LON = 80.05
CHENNAI_MAX_LON = 80.35


def _is_chennai(lat: float, lon: float) -> bool:
    return (
        CHENNAI_MIN_LAT <= lat <= CHENNAI_MAX_LAT
        and CHENNAI_MIN_LON <= lon <= CHENNAI_MAX_LON
    )


def _nominatim(path: str, params: dict) -> list | dict:
    url = f"{NOMINATIM_BASE}/{path}?{urlencode(params)}"
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Shoply-Delivery-Address/1.0",
        },
    )
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The map address service is temporarily unavailable",
        ) from exc


@router.get("/geocode/search")
def geocode_search(q: str = Query(min_length=2, max_length=200)):
    return _nominatim("search", {
        "q": f"{q}, Chennai",
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 6,
        "countrycodes": "in",
        "viewbox": "80.05,13.25,80.35,12.75",
        "bounded": 1,
    })


@router.get("/geocode/reverse")
def geocode_reverse(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
):
    if not _is_chennai(lat, lon):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Delivery location must be within Chennai",
        )
    return _nominatim("reverse", {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "addressdetails": 1,
    })


@router.get("", response_model=list[DeliveryAddressOut])
def list_addresses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return (
        db.query(DeliveryAddress)
        .filter(DeliveryAddress.user_id == user.id)
        .order_by(DeliveryAddress.is_default.desc(), DeliveryAddress.id.desc())
        .all()
    )


@router.post("", response_model=DeliveryAddressOut, status_code=status.HTTP_201_CREATED)
def save_address(
    data: DeliveryAddressIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if data.latitude is not None and data.longitude is not None:
        if not _is_chennai(data.latitude, data.longitude):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Delivery address must be within Chennai",
            )
    if "chennai" not in data.city.lower():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only Chennai addresses can be saved",
        )
    if data.is_default:
        db.query(DeliveryAddress).filter(
            DeliveryAddress.user_id == user.id,
            DeliveryAddress.is_default.is_(True),
        ).update({"is_default": False})

    address = DeliveryAddress(user_id=user.id, **data.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address
