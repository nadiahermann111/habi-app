from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_database, fetch_all, fetch_one_value


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - inicjalizacja bazy danych
    await init_database()
    print("Database initialized")

    yield

    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Habi API działa!", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "OK", "message": "API is running"}


# Test endpoint z bazą danych SQLite3
@app.get("/api/test-db")
async def test_database():
    # Test połączenia z bazą
    tables = await fetch_all("SELECT name FROM sqlite_master WHERE type='table'")
    rewards_count = await fetch_one_value("SELECT COUNT(*) FROM rewards")

    return {
        "message": "SQLite3 database connection works!",
        "tables": [table["name"] for table in tables],
        "rewards_count": rewards_count
    }


# Test endpoint - pokaż wszystkie nagrody
@app.get("/api/rewards")
async def get_rewards():
    rewards = await fetch_all("SELECT * FROM rewards")
    return {
        "rewards": [dict(reward) for reward in rewards]
    }


if __name__ == "__main__":
    import uvicorn


    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)