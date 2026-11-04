from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import User


email = input("Enter your existing user email: ").strip().lower()

with Session(engine) as db:
    user = db.scalar(
        select(User).where(User.email == email)
    )

    if user is None:
        print("User not found. Create the account first.")

    elif user.global_role == "super_admin":
        print("This user is already a Super Admin.")

    else:
        confirm = input(
            f"Promote {user.email} to Super Admin? (yes/no): "
        )

        if confirm.strip().lower() == "yes":
            user.global_role = "super_admin"
            db.commit()
            print("Super Admin created successfully.")
        else:
            print("Operation cancelled.")