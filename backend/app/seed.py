"""Demo data. Idempotent: safe to run on every startup."""
from sqlalchemy.orm import Session

from .models import Product, User
from .security import hash_password

DEMO_USERS = [
    {"name": "Shoply Admin", "email": "admin@shoply.dev", "password": "Admin123!", "is_admin": True},
    {"name": "Demo Customer", "email": "user@shoply.dev", "password": "User123!", "is_admin": False},
]

DEMO_PRODUCTS = [
    {
        "name": "Everyday Backpack",
        "description": "Lightweight everyday backpack with a padded laptop sleeve.",
        "category": "Accessories",
        "price": 1499,
        "stock": 25,
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700",
    },
    {
        "name": "Wireless Headphones",
        "description": "Comfortable over-ear headphones for everyday listening.",
        "category": "Electronics",
        "price": 2499,
        "stock": 18,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700",
    },
    {
        "name": "Classic Sneakers",
        "description": "Minimal sneakers designed for daily comfort.",
        "category": "Fashion",
        "price": 3299,
        "stock": 12,
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700",
    },
    {
        "name": "Ceramic Coffee Mug",
        "description": "A simple ceramic mug for your morning coffee.",
        "category": "Home",
        "price": 399,
        "stock": 40,
        "image_url": "https://images.unsplash.com/photo-1517256673644-36ad11246d21?w=700",
    },
]


def seed_demo_data(db: Session) -> None:
    for spec in DEMO_USERS:
        exists = db.query(User).filter(User.email == spec["email"]).first()
        if not exists:
            db.add(User(
                name=spec["name"],
                email=spec["email"],
                password_hash=hash_password(spec["password"]),
                is_admin=spec["is_admin"],
            ))
    if db.query(Product).count() == 0:
        db.add_all([Product(**p) for p in DEMO_PRODUCTS])
    db.commit()
