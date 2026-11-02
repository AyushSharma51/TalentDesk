from fastapi import FastAPI
from app.routes.companies import router as companies_router
from fastapi.middleware.cors import CORSMiddleware
from app.routes.users import router as users_router


app = FastAPI(
    title="NBMC & Sofsure HR System",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies_router)
app.include_router(users_router)

#-------------------------

@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "message": "HR System backend is running",
    }
