import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load variables from the .env file
load_dotenv()

# Read the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from the .env file")

# Create the SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# Function to test the database connection
def test_db_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:
        print(f"Database connection error: {error}")
        raise

def get_db():
    with Session(engine) as db:
        yield db