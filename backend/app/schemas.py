import re
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

ORDER_STATUSES = ("Processing", "Shipped", "Delivered", "Cancelled")
PHONE_RE = re.compile(r"^\+?[0-9][0-9 ()-]{6,18}$")


def _check_bcrypt_length(value: Optional[str]) -> Optional[str]:
    # bcrypt only uses the first 72 bytes of a password; reject longer ones explicitly.
    if value is not None and len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes long")
    return value


# ---------- auth / users ----------

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def _password_length(cls, v: str) -> str:
        return _check_bcrypt_length(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    current_password: Optional[str] = Field(default=None, max_length=72)
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def _password_length(cls, v: Optional[str]) -> Optional[str]:
        return _check_bcrypt_length(v)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    # Plain str on output so that legacy rows never break serialization.
    email: str
    is_admin: bool
    created_at: Optional[datetime] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- catalog ----------

class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)
    category: str = Field(default="General", min_length=1, max_length=80)
    price: Decimal = Field(gt=0, le=1_000_000, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0, le=100_000)
    image_url: str = Field(default="", max_length=1000)

    @field_validator("image_url")
    @classmethod
    def _image_url(cls, v: str) -> str:
        v = v.strip()
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("Image URL must start with http:// or https://")
        return v

    @field_validator("name", "category")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    category: str
    price: float
    stock: int
    image_url: str


# ---------- orders ----------

class CartLine(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=99)


class ShippingIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    address_line: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(default="", max_length=20)
    country: str = Field(default="India", min_length=2, max_length=80)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

    @field_validator("city")
    @classmethod
    def _chennai_city(cls, v: str) -> str:
        v = v.strip()
        if "chennai" not in v.lower():
            raise ValueError("Only Chennai delivery addresses are supported")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number")
        return v


class CheckoutIn(BaseModel):
    items: list[CartLine] = Field(min_length=1, max_length=50)
    shipping: ShippingIn


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: float
    shipping_name: str
    shipping_phone: str
    shipping_address: str
    shipping_city: str
    shipping_postal_code: str
    shipping_country: str
    created_at: datetime
    items: list[OrderItemOut]


class OrderAdminOut(OrderOut):
    customer_name: str
    customer_email: str


class OrderStatusIn(BaseModel):
    status: Literal["Processing", "Shipped", "Delivered", "Cancelled"]


class StatsOut(BaseModel):
    users: int
    products: int
    orders: int
    pending_orders: int
    revenue: float


class MessageOut(BaseModel):
    message: str


class DeliveryAddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    house_number: str = Field(default="", max_length=120)
    address_line: str = Field(min_length=5, max_length=300)
    landmark: str = Field(default="", max_length=180)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(default="", max_length=120)
    postal_code: str = Field(default="", max_length=20)
    country: str = Field(default="India", min_length=2, max_length=80)
    address_type: Literal["Home", "Work", "Other"] = "Home"
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_default: bool = False

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number")
        return v


class DeliveryAddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    house_number: str
    address_line: str
    landmark: str
    city: str
    state: str
    postal_code: str
    country: str
    address_type: str
    latitude: Optional[float]
    longitude: Optional[float]
    is_default: bool
