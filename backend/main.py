import os
import sys
import traceback
import logging
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Importy z obsługą błędów
def safe_import(module_name, fallback_message):
    try:
        module = __import__(module_name)
        logger.info(f"✅ {module_name} imported successfully")
        return module
    except Exception as e:
        logger.error(f"❌ Failed to import {module_name}: {e}")
        print(f"❌ Failed to import {module_name}: {e}")
        return None


# Próba importu modułów
database_module = safe_import('database', 'Using fallback database functions')
auth_module = safe_import('auth', 'Using fallback auth functions')


# Fallback funkcje jeśli importy się nie powiodły
def fallback_hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def fallback_verify_password(password: str, hashed: str) -> bool:
    return fallback_hash_password(password) == hashed


def fallback_create_token(user_id: int) -> str:
    import base64
    import json
    token_data = {"user_id": user_id, "created": datetime.now().isoformat()}
    return base64.b64encode(json.dumps(token_data).encode()).decode()


def fallback_verify_token(token: str) -> Optional[int]:
    try:
        import base64
        import json
        decoded = json.loads(base64.b64decode(token.encode()).decode())
        return decoded.get("user_id")
    except:
        return None


async def fallback_init_db():
    """Fallback database initialization"""
    try:
        import aiosqlite
        logger.info("Initializing database with fallback method...")

        async with aiosqlite.connect("database.db") as db:
            # Create users table
            await db.execute('''
                             CREATE TABLE IF NOT EXISTS users
                             (
                                 id
                                 INTEGER
                                 PRIMARY
                                 KEY
                                 AUTOINCREMENT,
                                 username
                                 TEXT
                                 UNIQUE
                                 NOT
                                 NULL,
                                 email
                                 TEXT
                                 UNIQUE
                                 NOT
                                 NULL,
                                 password_hash
                                 TEXT
                                 NOT
                                 NULL,
                                 coins
                                 INTEGER
                                 DEFAULT
                                 20,
                                 created_at
                                 TEXT
                                 DEFAULT
                                 CURRENT_TIMESTAMP
                             )
                             ''')

            # Create habits table
            await db.execute('''
                             CREATE TABLE IF NOT EXISTS habits
                             (
                                 id
                                 INTEGER
                                 PRIMARY
                                 KEY
                                 AUTOINCREMENT,
                                 user_id
                                 INTEGER
                                 NOT
                                 NULL,
                                 name
                                 TEXT
                                 NOT
                                 NULL,
                                 description
                                 TEXT,
                                 reward_coins
                                 INTEGER
                                 DEFAULT
                                 1,
                                 is_active
                                 INTEGER
                                 DEFAULT
                                 1,
                                 created_at
                                 TEXT
                                 DEFAULT
                                 CURRENT_TIMESTAMP,
                                 FOREIGN
                                 KEY
                             (
                                 user_id
                             ) REFERENCES users
                             (
                                 id
                             )
                                 )
                             ''')

            # Create habit_completions table
            await db.execute('''
                             CREATE TABLE IF NOT EXISTS habit_completions
                             (
                                 id
                                 INTEGER
                                 PRIMARY
                                 KEY
                                 AUTOINCREMENT,
                                 habit_id
                                 INTEGER
                                 NOT
                                 NULL,
                                 user_id
                                 INTEGER
                                 NOT
                                 NULL,
                                 coins_earned
                                 INTEGER
                                 NOT
                                 NULL,
                                 completed_at
                                 TEXT
                                 DEFAULT (
                                 date
                             (
                                 'now'
                             )),
                                 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY
                             (
                                 habit_id
                             ) REFERENCES habits
                             (
                                 id
                             ),
                                 FOREIGN KEY
                             (
                                 user_id
                             ) REFERENCES users
                             (
                                 id
                             )
                                 )
                             ''')

            await db.commit()
            logger.info("Database tables created successfully")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


# Użyj zaimportowanych funkcji lub fallback
if auth_module and hasattr(auth_module, 'hash_password'):
    hash_password = auth_module.hash_password
    verify_password = auth_module.verify_password
    create_token = auth_module.create_token
    verify_token = auth_module.verify_token
else:
    hash_password = fallback_hash_password
    verify_password = fallback_verify_password
    create_token = fallback_create_token
    verify_token = fallback_verify_token

if database_module and hasattr(database_module, 'init_db'):
    init_db = database_module.init_db
else:
    init_db = fallback_init_db


# Schematy
class UserRegisterLocal(BaseModel):
    username: str
    email: str
    password: str


class UserLoginLocal(BaseModel):
    email: str
    password: str


class UserResponseLocal(BaseModel):
    id: int
    username: str
    email: str
    coins: int


class LoginResponseLocal(BaseModel):
    message: str
    token: str
    user: UserResponseLocal


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    reward_coins: int = 1


class HabitResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    reward_coins: int
    is_active: bool
    created_at: str
    completed_today: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        traceback.print_exc()

    yield

    # Shutdown
    logger.info("👋 Shutting down application")


# Utwórz aplikację FastAPI
app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)


# Dodaj middleware do logowania requestów
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    logger.info(f"Request: {request.method} {request.url}")

    try:
        response = await call_next(request)
        duration = datetime.now() - start_time
        logger.info(f"Response: {response.status_code} in {duration.total_seconds():.2f}s")
        return response
    except Exception as e:
        duration = datetime.now() - start_time
        logger.error(f"Request failed after {duration.total_seconds():.2f}s: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )


# Konfiguracja CORS - bardziej permisywna dla debugowania
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nadiahermann111.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "*"  # Dla debugowania - usuń w produkcji
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Handler globalnych błędów
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


# Options handler dla CORS preflight
@app.options("/{path:path}")
async def options_handler(path: str):
    return {"message": "OK"}


# Endpoints
@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Habi API działa!",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/health")
async def health():
    logger.info("Health check requested")
    return {
        "status": "OK",
        "message": "Habi API is running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/test-db")
async def test_db():
    """Test bazy danych"""
    logger.info("Database test requested")
    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = await cursor.fetchall()
            result = {
                "message": "Database works!",
                "tables": [table[0] for table in tables],
                "timestamp": datetime.now().isoformat()
            }
            logger.info(f"Database test successful: {result}")
            return result
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "message": "Database error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


@app.post("/api/register", response_model=LoginResponseLocal)
async def register(user_data: UserRegisterLocal):
    """Rejestracja użytkownika"""
    logger.info(f"Registration attempt for email: {user_data.email}")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")
            db.row_factory = aiosqlite.Row

            # Sprawdź czy email już istnieje
            cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
            if await cursor.fetchone():
                logger.warning(f"Registration failed - email exists: {user_data.email}")
                raise HTTPException(status_code=400, detail="Email już jest zajęty")

            # Sprawdź czy username już istnieje
            cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
            if await cursor.fetchone():
                logger.warning(f"Registration failed - username exists: {user_data.username}")
                raise HTTPException(status_code=400, detail="Username już jest zajęty")

            # Hashuj hasło i dodaj użytkownika
            hashed_password = hash_password(user_data.password)
            cursor = await db.execute(
                "INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)",
                (user_data.username, user_data.email, hashed_password, 20)
            )
            await db.commit()

            user_id = cursor.lastrowid
            logger.info(f"User registered successfully with ID: {user_id}")

            # Pobierz utworzonego użytkownika
            cursor = await db.execute(
                "SELECT id, username, email, coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            # Utwórz token
            token = create_token(user_id)

            return LoginResponseLocal(
                message="Rejestracja udana",
                token=token,
                user=UserResponseLocal(
                    id=user["id"],
                    username=user["username"],
                    email=user["email"],
                    coins=user["coins"]
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas rejestracji: {str(e)}")


@app.post("/api/login", response_model=LoginResponseLocal)
async def login(login_data: UserLoginLocal):
    """Logowanie użytkownika"""
    logger.info(f"Login attempt for email: {login_data.email}")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")
            db.row_factory = aiosqlite.Row

            # Znajdź użytkownika
            cursor = await db.execute(
                "SELECT id, username, email, password_hash, coins FROM users WHERE email = ?",
                (login_data.email,)
            )
            user = await cursor.fetchone()

            if not user:
                logger.warning(f"Login failed - user not found: {login_data.email}")
                raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

            # Sprawdź hasło
            if not verify_password(login_data.password, user["password_hash"]):
                logger.warning(f"Login failed - invalid password for: {login_data.email}")
                raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

            # Utwórz token
            token = create_token(user["id"])
            logger.info(f"Login successful for user ID: {user['id']}")

            return LoginResponseLocal(
                message="Logowanie udane",
                token=token,
                user=UserResponseLocal(
                    id=user["id"],
                    username=user["username"],
                    email=user["email"],
                    coins=user["coins"]
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas logowania: {str(e)}")


@app.get("/api/profile", response_model=UserResponseLocal)
async def get_profile(authorization: str = Header(None)):
    """Pobierz profil użytkownika"""
    logger.info("Profile request received")

    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("Profile request without valid authorization header")
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        logger.warning("Profile request with invalid token")
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT id, username, email, coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            if not user:
                logger.warning(f"Profile request for non-existent user ID: {user_id}")
                raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

            logger.info(f"Profile returned for user ID: {user_id}")
            return UserResponseLocal(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                coins=user["coins"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania profilu: {str(e)}")


@app.get("/api/coins")
async def get_user_coins(authorization: str = Header(None)):
    """Pobierz liczbę monet użytkownika"""
    logger.info("Coins request received")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

            return {"coins": user["coins"], "user_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get coins error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania monet: {str(e)}")


@app.get("/api/habits", response_model=List[HabitResponse])
async def get_user_habits(authorization: str = Header(None)):
    """Pobierz wszystkie nawyki użytkownika"""
    logger.info("Habits list request received")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            db.row_factory = aiosqlite.Row

            # Pobierz nawyki użytkownika
            cursor = await db.execute(
                """SELECT h.*,
                          CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as completed_today
                   FROM habits h
                            LEFT JOIN habit_completions hc ON h.id = hc.habit_id
                       AND hc.user_id = ? AND hc.completed_at = date ('now')
                   WHERE h.user_id = ? AND h.is_active = 1
                   ORDER BY h.created_at DESC""",
                (user_id, user_id)
            )
            habits = await cursor.fetchall()

            result = [
                HabitResponse(
                    id=habit["id"],
                    name=habit["name"],
                    description=habit["description"],
                    reward_coins=habit["reward_coins"],
                    is_active=bool(habit["is_active"]),
                    created_at=habit["created_at"],
                    completed_today=bool(habit["completed_today"])
                )
                for habit in habits
            ]

            logger.info(f"Returned {len(result)} habits for user {user_id}")
            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get habits error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania nawyków: {str(e)}")


@app.post("/api/habits", response_model=HabitResponse)
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """Utwórz nowy nawyk"""
    logger.info(f"Create habit request: {habit_data.name}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Dodaj nawyk
            cursor = await db.execute(
                "INSERT INTO habits (user_id, name, description, reward_coins) VALUES (?, ?, ?, ?)",
                (user_id, habit_data.name, habit_data.description, habit_data.reward_coins)
            )
            await db.commit()

            habit_id = cursor.lastrowid
            logger.info(f"Habit created with ID: {habit_id} for user {user_id}")

            # Pobierz utworzony nawyk
            cursor = await db.execute(
                "SELECT * FROM habits WHERE id = ?",
                (habit_id,)
            )
            habit = await cursor.fetchone()

            return HabitResponse(
                id=habit["id"],
                name=habit["name"],
                description=habit["description"],
                reward_coins=habit["reward_coins"],
                is_active=bool(habit["is_active"]),
                created_at=habit["created_at"],
                completed_today=False
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create habit error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas tworzenia nawyku: {str(e)}")


@app.post("/api/habits/{habit_id}/complete")
async def complete_habit(habit_id: int, authorization: str = Header(None)):
    """Oznacz nawyk jako wykonany dzisiaj"""
    logger.info(f"Complete habit request for habit {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                logger.warning(f"Habit {habit_id} not found for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Sprawdź czy nawyk nie został już wykonany dzisiaj
            cursor = await db.execute(
                "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = date('now')",
                (habit_id, user_id)
            )
            existing_completion = await cursor.fetchone()

            if existing_completion:
                logger.warning(f"Habit {habit_id} already completed today by user {user_id}")
                raise HTTPException(status_code=400, detail="Nawyk już został wykonany dzisiaj")

            # Dodaj wykonanie nawyku
            await db.execute(
                "INSERT INTO habit_completions (habit_id, user_id, coins_earned) VALUES (?, ?, ?)",
                (habit_id, user_id, habit["reward_coins"])
            )

            # Dodaj monety użytkownikowi
            await db.execute(
                "UPDATE users SET coins = coins + ? WHERE id = ?",
                (habit["reward_coins"], user_id)
            )

            await db.commit()

            # Pobierz nową liczbę monet
            cursor = await db.execute(
                "SELECT coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            logger.info(f"Habit {habit_id} completed by user {user_id}, earned {habit['reward_coins']} coins")

            return {
                "message": f"Nawyk wykonany! Otrzymałeś {habit['reward_coins']} monet",
                "coins_earned": habit["reward_coins"],
                "total_coins": user["coins"] if user else 0
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complete habit error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas oznaczania nawyku: {str(e)}")


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, authorization: str = Header(None)):
    """Usuń nawyk (oznacz jako nieaktywny)"""
    logger.info(f"Delete habit request for habit {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        import aiosqlite
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT id FROM habits WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                logger.warning(f"Habit {habit_id} not found for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Oznacz jako nieaktywny zamiast usuwać
            await db.execute(
                "UPDATE habits SET is_active = 0 WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            await db.commit()

            logger.info(f"Habit {habit_id} deleted by user {user_id}")
            return {"message": "Nawyk został usunięty"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete habit error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas usuwania nawyku: {str(e)}")


# Endpoint do debugowania
@app.get("/api/debug/logs")
async def get_logs():
    """Endpoint do pobierania logów (tylko dla debugowania)"""
    return {
        "message": "Check server logs for detailed information",
        "timestamp": datetime.now().isoformat(),
        "status": "debug_mode"
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")