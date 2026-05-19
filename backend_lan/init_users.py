"""
Initialize default users for TrakCare Offline LAN.
Run after applying Alembic migrations.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal, engine, Base
from app import models


def init_users():
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(
                username="admin",
                hashed_password=models.User.hash_password("admin"),
                role="admin",
                is_admin=True,
                active=True,
                nombre="Administrador"
            )
            db.add(admin)
            print("Created user: admin / admin")
        else:
            print("User 'admin' already exists")

        demo = db.query(models.User).filter(models.User.username == "demo").first()
        if not demo:
            demo = models.User(
                username="demo",
                hashed_password=models.User.hash_password("demo"),
                role="user",
                is_admin=False,
                active=True,
                nombre="Usuario Demo"
            )
            db.add(demo)
            print("Created user: demo / demo")
        else:
            print("User 'demo' already exists")

        db.commit()
        print("Users initialized successfully.")
        print("IMPORTANT: Change passwords in production.")

    except Exception as e:
        print(f"Error initializing users: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    init_users()
