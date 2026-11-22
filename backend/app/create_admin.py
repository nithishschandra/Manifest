"""Create or promote an administrator account.

Usage (from the backend folder):
    python -m app.create_admin --email you@example.com --name "Your Name"

The password is prompted for, so it never appears in shell history.
"""
import argparse
import getpass
import sys

from .database import Base, SessionLocal, engine
from .models import User
from .security import hash_password


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or promote a Shoply admin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()

    password = getpass.getpass("Password (min 8 characters): ")
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        print("Password must be 8-72 bytes long.", file=sys.stderr)
        return 1

    Base.metadata.create_all(bind=engine)
    email = args.email.strip().lower()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_admin = True
            user.password_hash = hash_password(password)
            user.name = args.name.strip()
            action = "updated"
        else:
            db.add(User(name=args.name.strip(), email=email,
                        password_hash=hash_password(password), is_admin=True))
            action = "created"
        db.commit()
    print(f"Admin account {action}: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
