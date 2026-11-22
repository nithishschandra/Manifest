"""End-to-end API tests. They run against SQLite so no Postgres is needed."""
import os
from pathlib import Path

TEST_DB = Path(__file__).resolve().parent / "test_shoply.db"
if TEST_DB.exists():
    TEST_DB.unlink()
# Set TEST_DATABASE_URL to run the suite against PostgreSQL; otherwise SQLite is used.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{TEST_DB}"
os.environ.setdefault("APP_ENV", "development")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

SHIPPING = {
    "full_name": "Asha Rao",
    "phone": "+91 98765 43210",
    "address_line": "12 MG Road, Near Park",
    "city": "Chennai",
    "postal_code": "600001",
    "country": "India",
}


@pytest.fixture(scope="module")
def client():
    # Start every run from an empty schema so results do not depend on earlier runs.
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as c:
        yield c
    engine.dispose()
    if TEST_DB.exists():
        TEST_DB.unlink()


def login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def customer(client):
    email = "tester@example.com"
    client.post("/api/auth/register", json={"name": "Tester", "email": email, "password": "Tester123!"})
    return login(client, email, "Tester123!")


@pytest.fixture(scope="module")
def admin(client):
    return login(client, "admin@shoply.dev", "Admin123!")


def test_demo_accounts_can_sign_in(client):
    user = client.post("/api/auth/login", json={"email": "user@shoply.dev", "password": "User123!"})
    assert user.status_code == 200
    assert user.json()["user"]["is_admin"] is False
    admin_r = client.post("/api/auth/login", json={"email": "admin@shoply.dev", "password": "Admin123!"})
    assert admin_r.json()["user"]["is_admin"] is True


def test_wrong_password_is_rejected(client):
    r = client.post("/api/auth/login", json={"email": "user@shoply.dev", "password": "nope-nope"})
    assert r.status_code == 401


def test_register_duplicate_email_conflicts(client):
    r = client.post("/api/auth/register", json={"name": "Dup", "email": "user@shoply.dev", "password": "Whatever1!"})
    assert r.status_code == 409


def test_protected_routes_need_a_token(client):
    assert client.get("/api/orders").status_code == 401
    assert client.get("/api/profile").status_code == 401


def test_product_search_filter_and_detail(client):
    all_products = client.get("/api/products").json()
    assert len(all_products) >= 4
    found = client.get("/api/products", params={"q": "headphones"}).json()
    assert [p["name"] for p in found] == ["Wireless Headphones"]
    by_cat = client.get("/api/products", params={"category": "Home"}).json()
    assert all(p["category"] == "Home" for p in by_cat)
    cats = client.get("/api/products/categories").json()
    assert "Electronics" in cats
    detail = client.get(f"/api/products/{all_products[0]['id']}")
    assert detail.status_code == 200
    assert client.get("/api/products/999999").status_code == 404


def test_search_treats_wildcards_literally(client):
    assert client.get("/api/products", params={"q": "%"}).json() == []


def test_checkout_decrements_stock_and_order_is_private(client, customer):
    product = client.get("/api/products", params={"q": "mug"}).json()[0]
    before = product["stock"]
    r = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 2}], "shipping": SHIPPING},
        headers=customer,
    )
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "Processing"
    assert order["items"][0]["quantity"] == 2
    assert abs(order["total"] - 2 * product["price"]) < 0.01

    after = client.get(f"/api/products/{product['id']}").json()["stock"]
    assert after == before - 2

    assert client.get(f"/api/orders/{order['id']}", headers=customer).status_code == 200
    other = login(client, "user@shoply.dev", "User123!")
    assert client.get(f"/api/orders/{order['id']}", headers=other).status_code == 404


def test_checkout_rejects_insufficient_stock(client, customer):
    product = client.get("/api/products", params={"q": "sneakers"}).json()[0]
    r = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": product["stock"] + 1}], "shipping": SHIPPING},
        headers=customer,
    )
    assert r.status_code == 400
    assert "in stock" in r.json()["detail"]


def test_duplicate_cart_lines_are_checked_together(client, customer):
    product = client.get("/api/products", params={"q": "mug"}).json()[0]
    stock_before = product["stock"]
    r = client.post(
        "/api/orders",
        json={"items": [
            {"product_id": product["id"], "quantity": stock_before},
            {"product_id": product["id"], "quantity": 1},
        ], "shipping": SHIPPING},
        headers=customer,
    )
    assert r.status_code == 400
    assert client.get(f"/api/products/{product['id']}").json()["stock"] == stock_before


def test_cancel_restores_stock(client, customer):
    product = client.get("/api/products", params={"q": "backpack"}).json()[0]
    order = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 3}], "shipping": SHIPPING},
        headers=customer,
    ).json()
    stock_after_order = client.get(f"/api/products/{product['id']}").json()["stock"]
    r = client.post(f"/api/orders/{order['id']}/cancel", headers=customer)
    assert r.status_code == 200
    assert r.json()["status"] == "Cancelled"
    assert client.get(f"/api/products/{product['id']}").json()["stock"] == stock_after_order + 3
    ongoing = client.get("/api/orders", headers=customer).json()
    assert all(item["status"] in ("Processing", "Shipped") for item in ongoing)
    assert order["id"] not in [item["id"] for item in ongoing]
    again = client.post(f"/api/orders/{order['id']}/cancel", headers=customer)
    assert again.status_code == 400


def test_invalid_shipping_phone_is_rejected(client, customer):
    product = client.get("/api/products").json()[0]
    bad = {**SHIPPING, "phone": "call me maybe"}
    r = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 1}], "shipping": bad},
        headers=customer,
    )
    assert r.status_code == 422


def test_checkout_restricts_delivery_to_chennai(client, customer):
    product = client.get("/api/products").json()[0]
    outside = {**SHIPPING, "city": "Mumbai", "latitude": 19.0760, "longitude": 72.8777}
    r = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 1}], "shipping": outside},
        headers=customer,
    )
    assert r.status_code == 422


def test_customer_can_save_and_retrieve_delivery_address(client, customer):
    payload = {
        "full_name": "Asha Rao",
        "phone": "+91 98765 43210",
        "house_number": "12",
        "address_line": "MG Road",
        "landmark": "Near Park",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postal_code": "600001",
        "country": "India",
        "address_type": "Home",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "is_default": True,
    }
    created = client.post("/api/addresses", json=payload, headers=customer)
    assert created.status_code == 201
    assert created.json()["latitude"] == 13.0827
    assert created.json()["longitude"] == 80.2707

    addresses = client.get("/api/addresses", headers=customer)
    assert addresses.status_code == 200
    assert any(item["postal_code"] == "600001" for item in addresses.json())


def test_customer_cannot_use_admin_routes(client, customer):
    assert client.get("/api/admin/stats", headers=customer).status_code == 403
    assert client.get("/api/admin/orders", headers=customer).status_code == 403


def test_admin_product_lifecycle(client, admin):
    payload = {"name": "Test Lamp", "description": "Desk lamp", "category": "Home",
               "price": 899, "stock": 5, "image_url": "https://example.com/lamp.jpg"}
    created = client.post("/api/admin/products", json=payload, headers=admin)
    assert created.status_code == 201
    pid = created.json()["id"]

    payload["stock"] = 7
    updated = client.put(f"/api/admin/products/{pid}", json=payload, headers=admin)
    assert updated.json()["stock"] == 7

    bad = client.post("/api/admin/products", json={**payload, "image_url": "javascript:alert(1)"}, headers=admin)
    assert bad.status_code == 422

    assert client.delete(f"/api/admin/products/{pid}", headers=admin).status_code == 200
    assert client.get(f"/api/products/{pid}").status_code == 404


def test_product_in_orders_cannot_be_deleted(client, admin, customer):
    product = client.get("/api/products", params={"q": "ceramic"}).json()[0]
    client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 1}], "shipping": SHIPPING},
        headers=customer,
    )
    r = client.delete(f"/api/admin/products/{product['id']}", headers=admin)
    assert r.status_code == 409


def test_admin_order_management(client, admin, customer):
    product = client.get("/api/products", params={"q": "headphones"}).json()[0]
    order = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 1}], "shipping": SHIPPING},
        headers=customer,
    ).json()
    orders = client.get("/api/admin/orders", headers=admin).json()
    match = next(o for o in orders if o["id"] == order["id"])
    assert match["customer_email"] == "tester@example.com"

    shipped = client.patch(f"/api/admin/orders/{order['id']}/status", json={"status": "Shipped"}, headers=admin)
    assert shipped.json()["status"] == "Shipped"
    assert client.get("/api/admin/users", headers=admin).status_code == 200
    stats = client.get("/api/admin/stats", headers=admin).json()
    assert stats["orders"] >= 1


def test_profile_update_and_password_change(client):
    headers = login(client, "tester@example.com", "Tester123!")
    r = client.put("/api/profile", json={"name": "Tester Two"}, headers=headers)
    assert r.json()["name"] == "Tester Two"

    wrong = client.put("/api/profile", json={"current_password": "bad", "new_password": "NewPass123!"}, headers=headers)
    assert wrong.status_code == 400

    ok = client.put("/api/profile", json={"current_password": "Tester123!", "new_password": "NewPass123!"}, headers=headers)
    assert ok.status_code == 200
    login(client, "tester@example.com", "NewPass123!")


def test_admin_cannot_cancel_a_shipped_order(client, admin, customer):
    product = client.get("/api/products", params={"q": "mug"}).json()[0]
    order = client.post(
        "/api/orders",
        json={"items": [{"product_id": product["id"], "quantity": 1}], "shipping": SHIPPING},
        headers=customer,
    ).json()
    client.patch(f"/api/admin/orders/{order['id']}/status", json={"status": "Shipped"}, headers=admin)
    r = client.patch(f"/api/admin/orders/{order['id']}/status", json={"status": "Cancelled"}, headers=admin)
    assert r.status_code == 400


def test_health_endpoint(client):
    assert client.get("/api/health").json() == {"status": "ok"}
