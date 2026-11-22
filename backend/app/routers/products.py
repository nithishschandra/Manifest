from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import ProductOut

router = APIRouter(prefix="/products", tags=["products"])

SORTS = {
    "newest": (Product.id.desc(),),
    "price_asc": (Product.price.asc(), Product.id.desc()),
    "price_desc": (Product.price.desc(), Product.id.desc()),
    "name": (Product.name.asc(),),
}


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[ProductOut])
def list_products(
    q: str = Query(default="", max_length=100),
    category: str = Query(default="", max_length=80),
    sort: str = Query(default="newest"),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    term = q.strip()
    if term:
        pattern = f"%{_escape_like(term)}%"
        query = query.filter(or_(
            Product.name.ilike(pattern, escape="\\"),
            Product.description.ilike(pattern, escape="\\"),
        ))
    if category:
        query = query.filter(Product.category == category)
    order_by = SORTS.get(sort, SORTS["newest"])
    return query.order_by(*order_by).all()


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Product.category).distinct().order_by(Product.category).all()
    return [row[0] for row in rows]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product
