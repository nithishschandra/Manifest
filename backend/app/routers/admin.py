from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, User
from ..schemas import (
    MessageOut,
    OrderAdminOut,
    OrderOut,
    OrderStatusIn,
    ProductIn,
    ProductOut,
    StatsOut,
    UserOut,
)
from ..security import admin_user
from .orders import restore_stock

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=StatsOut)
def stats(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    revenue = (
        db.query(func.coalesce(func.sum(Order.total), 0))
        .filter(Order.status != "Cancelled")
        .scalar()
    )
    return {
        "users": db.query(User).count(),
        "products": db.query(Product).count(),
        "orders": db.query(Order).count(),
        "pending_orders": db.query(Order).filter(Order.status == "Processing").count(),
        "revenue": float(revenue or 0),
    }


# ---------- products ----------

def _get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    product = _get_product(db, product_id)
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", response_model=MessageOut)
def delete_product(product_id: int, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    product = _get_product(db, product_id)
    if db.query(OrderItem).filter(OrderItem.product_id == product_id).first():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This product appears in past orders. Set its stock to 0 instead of deleting it.",
        )
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


# ---------- orders ----------

def _admin_order(order: Order) -> dict:
    data = OrderOut.model_validate(order).model_dump()
    data["customer_name"] = order.user.name
    data["customer_email"] = order.user.email
    return data


@router.get("/orders", response_model=list[OrderAdminOut])
def list_orders(
    status_filter: Optional[str] = None,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return [_admin_order(o) for o in query.order_by(Order.id.desc()).all()]


@router.patch("/orders/{order_id}/status", response_model=OrderAdminOut)
def update_order_status(
    order_id: int,
    data: OrderStatusIn,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order.status == "Cancelled" and data.status != "Cancelled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cancelled orders cannot be reopened")
    if data.status == "Cancelled" and order.status != "Cancelled":
        if order.status != "Processing":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only orders that are still processing can be cancelled")
        restore_stock(db, order)
    order.status = data.status
    db.commit()
    db.refresh(order)
    return _admin_order(order)


# ---------- users ----------

@router.get("/users", response_model=list[UserOut])
def list_users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [UserOut.model_validate(u) for u in db.query(User).order_by(User.id).all()]
