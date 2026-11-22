from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, User
from ..schemas import CheckoutIn, OrderOut
from ..security import current_user

router = APIRouter(prefix="/orders", tags=["orders"])
CENT = Decimal("0.01")


def restore_stock(db: Session, order: Order) -> None:
    """Put the quantities of a cancelled order back into stock."""
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock += item.quantity


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def place_order(data: CheckoutIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Merge duplicate lines so stock is checked against the full quantity.
    quantities: dict[int, int] = {}
    for line in data.items:
        quantities[line.product_id] = quantities.get(line.product_id, 0) + line.quantity
    if any(qty > 99 for qty in quantities.values()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can order at most 99 of an item at once")

    try:
        # Lock the product rows so two checkouts cannot oversell the same stock.
        products = {
            p.id: p
            for p in db.query(Product).filter(Product.id.in_(quantities.keys())).with_for_update().all()
        }
        total = Decimal("0")
        for product_id, qty in quantities.items():
            product = products.get(product_id)
            if product is None:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Product #{product_id} is no longer available")
            if product.stock < qty:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Only {product.stock} of '{product.name}' left in stock",
                )
            total += Decimal(str(product.price)) * qty

        shipping = data.shipping
        if (
            shipping.latitude is not None
            and shipping.longitude is not None
            and not (
                12.75 <= shipping.latitude <= 13.25
                and 80.05 <= shipping.longitude <= 80.35
            )
        ):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Delivery location must be within Chennai",
            )
        order = Order(
            user_id=user.id,
            status="Processing",
            total=total.quantize(CENT),
            shipping_name=shipping.full_name.strip(),
            shipping_phone=shipping.phone,
            shipping_address=shipping.address_line.strip(),
            shipping_city=shipping.city.strip(),
            shipping_postal_code=shipping.postal_code.strip(),
            shipping_country=shipping.country.strip(),
        )
        for product_id, qty in quantities.items():
            product = products[product_id]
            product.stock -= qty
            order.items.append(OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=qty,
                unit_price=product.price,
            ))
        db.add(order)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    db.refresh(order)
    return OrderOut.model_validate(order)


@router.get("", response_model=list[OrderOut])
def my_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .filter(
            Order.user_id == user.id,
            Order.status.in_(("Processing", "Shipped")),
        )
        .order_by(Order.id.desc())
        .all()
    )


def _own_order(db: Session, user: User, order_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _own_order(db, user, order_id)


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    order = _own_order(db, user, order_id)
    if order.status != "Processing":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only orders that are still processing can be cancelled")
    restore_stock(db, order)
    order.status = "Cancelled"
    db.commit()
    db.refresh(order)
    return order
