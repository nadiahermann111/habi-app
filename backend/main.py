import os
import sys
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, validator, Field

# Importy
try:
    from database import init_db

    print("✅ database.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import database.py: {e}")

try:
    import aiosqlite

    print("✅ aiosqlite imported successfully")
except Exception as e:
    print(f"❌ Failed to import aiosqlite: {e}")

try:
    from schemas import UserRegister, UserLogin, UserResponse, LoginResponse

    print("✅ schemas.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import schemas.py: {e}")

try:
    from auth import hash_password, verify_password, create_token, verify_token

    print("✅ auth.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import auth.py: {e}")


# Podstawowe schematy (jeśli nie działają importy)
class UserRegisterLocal(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+


class UserResponseLocal(BaseModel):
    id: int
    username: str
    email: str
    coins: int


class LoginResponseLocal(BaseModel):
    message: str
    token: str
    user: UserResponseLocal


# Habit schemas with proper validation
class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    reward_coins: int = Field(default=1, ge=1, le=10)

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Habit name cannot be empty')
        return v.strip()

    @validator('description', pre=True)
    def validate_description(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    @validator('reward_coins')
    def validate_reward_coins(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Reward coins must be between 1 and 10')
        return v


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
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    yield
    # Shutdown
    print("👋 Shutting down")


app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)


# DODAJ MIDDLEWARE CORS HEADERS PRZED CORS MIDDLEWARE
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    print(f"🌐 Request from origin: {request.headers.get('origin')}")
    print(f"🌐 Request method: {request.method}")
    print(f"🌐 Request URL: {request.url}")

    response = await call_next(request)

    # Dodaj CORS headers do każdej odpowiedzi
    response.headers["Access-Control-Allow-Origin"] = "https://nadiahermann111.github.io"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    print(f"✅ Added CORS headers to response")
    return response


# CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nadiahermann111.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# EXPLICIT OPTIONS HANDLER
@app.options("/{path:path}")
async def options_handler(path: str):
    print(f"🔧 OPTIONS request for path: {path}")
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "https://nadiahermann111.github.io",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "*"
        }
    )


# ROOT ENDPOINTS
@app.get("/")
async def root():
    return {"message": "Habi API działa!", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "OK", "cors": "enabled"}


@app.get("/api/test-db")
async def test_db():
    """Test bazy danych"""
    try:
        async with aiosqlite.connect("database.db") as db:
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = await cursor.fetchall()
            return {
                "message": "Database works!",
                "tables": [table[0] for table in tables]
            }
    except Exception as e:
        return {
            "message": "Database error",
            "error": str(e)
        }


# DEBUG ENDPOINTS
@app.get("/api/debug/users")
async def debug_users():
    """Debug endpoint - sprawdź wszystkich użytkowników"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users],
            "count": len(users)
        }


@app.get("/api/debug/check-email/{email}")
async def debug_check_email(email: str):
    """Debug endpoint - sprawdź czy email istnieje"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email FROM users WHERE email = ?", (email,))
        user = await cursor.fetchone()
        return {
            "email": email,
            "exists": user is not None,
            "user": dict(user) if user else None
        }


# AUTH ENDPOINTS
@app.post("/api/register", response_model=LoginResponseLocal)
async def register(user_data: UserRegisterLocal):
    """Rejestracja użytkownika"""
    print(f"🔐 Registration attempt for: {user_data.email}")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy email już istnieje
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email już jest zajęty")

        # Sprawdź czy username już istnieje
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username już jest zajęty")

        # Hashuj hasło i dodaj użytkownika
        hashed_password = hash_password(user_data.password)
        cursor = await db.execute(
            "INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)",
            (user_data.username, user_data.email, hashed_password, 20)
        )
        await db.commit()

        user_id = cursor.lastrowid
        print(f"✅ User registered with ID: {user_id}")

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


@app.post("/api/login", response_model=LoginResponseLocal)
async def login(login_data: UserLoginLocal):
    """Logowanie użytkownika"""
    print(f"🔐 Login attempt for: {login_data.email}")

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
            print(f"❌ User not found: {login_data.email}")
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # Sprawdź hasło
        if not verify_password(login_data.password, user["password_hash"]):
            print(f"❌ Invalid password for: {login_data.email}")
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        print(f"✅ Login successful for: {login_data.email}")

        # Utwórz token
        token = create_token(user["id"])

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


@app.get("/api/coins")
async def get_user_coins(authorization: str = Header(None)):
    """Pobierz liczbę monet użytkownika"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

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


@app.post("/api/coins/add")
async def add_coins(amount: int, authorization: str = Header(None)):
    """Dodaj monety użytkownikowi (dla testów)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Kwota musi być większa od 0")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Dodaj monety
        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        # Pobierz nową liczbę monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        return {
            "message": f"Dodano {amount} monet",
            "coins": user["coins"] if user else 0,
            "added": amount
        }


@app.get("/api/profile", response_model=UserResponseLocal)
async def get_profile(authorization: str = Header(None)):
    """Pobierz profil użytkownika (wymaga tokenu)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        return UserResponseLocal(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            coins=user["coins"]
        )


@app.get("/api/users")
async def get_users():
    """Pobierz wszystkich użytkowników"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, coins, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users]
        }


# ========== HABIT ENDPOINTS ==========

@app.get("/api/habits", response_model=List[HabitResponse])
async def get_user_habits(authorization: str = Header(None)):
    """Pobierz wszystkie nawyki użytkownika"""
    print("📋 Getting user habits...")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

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

        print(f"📋 Found {len(habits)} habits for user {user_id}")

        return [
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


@app.post("/api/habits", response_model=HabitResponse)
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """Utwórz nowy nawyk"""
    print(f"➕ Creating habit: {habit_data.name}")
    print(f"📋 Full habit data: {habit_data}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź limit nawyków dla użytkownika (opcjonalnie)
            cursor = await db.execute(
                "SELECT COUNT(*) as count FROM habits WHERE user_id = ? AND is_active = 1",
                (user_id,)
            )
            habit_count = await cursor.fetchone()

            if habit_count and habit_count["count"] >= 20:  # Limit 20 aktywnych nawyków
                raise HTTPException(status_code=400, detail="Osiągnięto maksymalną liczbę nawyków (20)")

            # Dodaj nawyk
            cursor = await db.execute(
                "INSERT INTO habits (user_id, name, description, reward_coins) VALUES (?, ?, ?, ?)",
                (user_id, habit_data.name, habit_data.description, habit_data.reward_coins)
            )
            await db.commit()

            habit_id = cursor.lastrowid
            print(f"✅ Habit created with ID: {habit_id}")

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

    except Exception as e:
        print(f"❌ Error creating habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas tworzenia nawyku: {str(e)}")


@app.post("/api/habits/{habit_id}/complete")
async def complete_habit(habit_id: int, authorization: str = Header(None)):
    """Oznacz nawyk jako wykonany dzisiaj"""
    print(f"✅ Completing habit: {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if habit_id <= 0:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID nawyku")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                print(f"❌ Habit not found: {habit_id} for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Sprawdź czy nawyk nie został już wykonany dzisiaj
            cursor = await db.execute(
                "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = date('now')",
                (habit_id, user_id)
            )
            existing_completion = await cursor.fetchone()

            if existing_completion:
                print(f"❌ Habit already completed today: {habit_id}")
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
            print(f"✅ Habit completed! User {user_id} earned {habit['reward_coins']} coins")

            # Pobierz nową liczbę monet
            cursor = await db.execute(
                "SELECT coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            return {
                "message": f"Nawyk wykonany! Otrzymałeś {habit['reward_coins']} monet",
                "coins_earned": habit["reward_coins"],
                "total_coins": user["coins"] if user else 0
            }

    except Exception as e:
        print(f"❌ Error completing habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas oznaczania nawyku: {str(e)}")


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, authorization: str = Header(None)):
    """Usuń nawyk (oznacz jako nieaktywny)"""
    print(f"🗑️ Deleting habit: {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if habit_id <= 0:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID nawyku")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT id FROM habits WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                print(f"❌ Habit not found: {habit_id} for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Oznacz jako nieaktywny zamiast usuwać
            await db.execute(
                "UPDATE habits SET is_active = 0 WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            await db.commit()

            print(f"✅ Habit deleted: {habit_id}")
            return {"message": "Nawyk został usunięty"}

    except Exception as e:
        print(f"❌ Error deleting habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas usuwania nawyku: {str(e)}")


# Additional debug endpoint for habits
@app.get("/api/debug/habits")
async def debug_habits():
    """Debug endpoint - sprawdź wszystkie nawyki"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM habits ORDER BY created_at DESC")
        habits = await cursor.fetchall()
        return {
            "habits": [dict(habit) for habit in habits],
            "count": len(habits)
        }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False))
    password: str = Field(..., min_length=6) \
 \
                    @ validator('username')


    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError('Username cannot be empty')
        v = v.strip()
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores and hyphens')
        return v


    @validator('email')
    def validate_email(cls, v):
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        return v.strip().lower()


class UserLoginLocal(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

    @validator('email')
    def validate_email(cls, v):
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        return v.strip().lower()


class UserResponseLocal(BaseModel):
    id: int
    username: str
    email: str
    coins: int


class LoginResponseLocal(BaseModel):
    message: str
    token: str
    user: UserResponseLocal


# Habit schemas with proper validation
class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    reward_coins: int = Field(default=1, ge=1, le=10)

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Habit name cannot be empty')
        return v.strip()

    @validator('description', pre=True)
    def validate_description(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    @validator('reward_coins')
    def validate_reward_coins(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Reward coins must be between 1 and 10')
        return v


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
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    yield
    # Shutdown
    print("👋 Shutting down")


app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)


# DODAJ MIDDLEWARE CORS HEADERS PRZED CORS MIDDLEWARE
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    print(f"🌐 Request from origin: {request.headers.get('origin')}")
    print(f"🌐 Request method: {request.method}")
    print(f"🌐 Request URL: {request.url}")

    response = await call_next(request)

    # Dodaj CORS headers do każdej odpowiedzi
    response.headers["Access-Control-Allow-Origin"] = "https://nadiahermann111.github.io"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    print(f"✅ Added CORS headers to response")
    return response


# CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nadiahermann111.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# EXPLICIT OPTIONS HANDLER
@app.options("/{path:path}")
async def options_handler(path: str):
    print(f"🔧 OPTIONS request for path: {path}")
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "https://nadiahermann111.github.io",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "*"
        }
    )


# ROOT ENDPOINTS
@app.get("/")
async def root():
    return {"message": "Habi API działa!", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "OK", "cors": "enabled"}


@app.get("/api/test-db")
async def test_db():
    """Test bazy danych"""
    try:
        async with aiosqlite.connect("database.db") as db:
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = await cursor.fetchall()
            return {
                "message": "Database works!",
                "tables": [table[0] for table in tables]
            }
    except Exception as e:
        return {
            "message": "Database error",
            "error": str(e)
        }


# DEBUG ENDPOINTS
@app.get("/api/debug/users")
async def debug_users():
    """Debug endpoint - sprawdź wszystkich użytkowników"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users],
            "count": len(users)
        }


@app.get("/api/debug/check-email/{email}")
async def debug_check_email(email: str):
    """Debug endpoint - sprawdź czy email istnieje"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email FROM users WHERE email = ?", (email,))
        user = await cursor.fetchone()
        return {
            "email": email,
            "exists": user is not None,
            "user": dict(user) if user else None
        }


# AUTH ENDPOINTS
@app.post("/api/register", response_model=LoginResponseLocal)
async def register(user_data: UserRegisterLocal):
    """Rejestracja użytkownika"""
    print(f"🔐 Registration attempt for: {user_data.email}")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy email już istnieje
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email już jest zajęty")

        # Sprawdź czy username już istnieje
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username już jest zajęty")

        # Hashuj hasło i dodaj użytkownika
        hashed_password = hash_password(user_data.password)
        cursor = await db.execute(
            "INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)",
            (user_data.username, user_data.email, hashed_password, 20)
        )
        await db.commit()

        user_id = cursor.lastrowid
        print(f"✅ User registered with ID: {user_id}")

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


@app.post("/api/login", response_model=LoginResponseLocal)
async def login(login_data: UserLoginLocal):
    """Logowanie użytkownika"""
    print(f"🔐 Login attempt for: {login_data.email}")

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
            print(f"❌ User not found: {login_data.email}")
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # Sprawdź hasło
        if not verify_password(login_data.password, user["password_hash"]):
            print(f"❌ Invalid password for: {login_data.email}")
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        print(f"✅ Login successful for: {login_data.email}")

        # Utwórz token
        token = create_token(user["id"])

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


@app.get("/api/coins")
async def get_user_coins(authorization: str = Header(None)):
    """Pobierz liczbę monet użytkownika"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

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


@app.post("/api/coins/add")
async def add_coins(amount: int, authorization: str = Header(None)):
    """Dodaj monety użytkownikowi (dla testów)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Kwota musi być większa od 0")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Dodaj monety
        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        # Pobierz nową liczbę monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        return {
            "message": f"Dodano {amount} monet",
            "coins": user["coins"] if user else 0,
            "added": amount
        }


@app.get("/api/profile", response_model=UserResponseLocal)
async def get_profile(authorization: str = Header(None)):
    """Pobierz profil użytkownika (wymaga tokenu)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        return UserResponseLocal(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            coins=user["coins"]
        )


@app.get("/api/users")
async def get_users():
    """Pobierz wszystkich użytkowników"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, coins, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users]
        }


# ========== HABIT ENDPOINTS ==========

@app.get("/api/habits", response_model=List[HabitResponse])
async def get_user_habits(authorization: str = Header(None)):
    """Pobierz wszystkie nawyki użytkownika"""
    print("📋 Getting user habits...")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

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

        print(f"📋 Found {len(habits)} habits for user {user_id}")

        return [
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


@app.post("/api/habits", response_model=HabitResponse)
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """Utwórz nowy nawyk"""
    print(f"➕ Creating habit: {habit_data.name}")
    print(f"📋 Full habit data: {habit_data}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź limit nawyków dla użytkownika (opcjonalnie)
            cursor = await db.execute(
                "SELECT COUNT(*) as count FROM habits WHERE user_id = ? AND is_active = 1",
                (user_id,)
            )
            habit_count = await cursor.fetchone()

            if habit_count and habit_count["count"] >= 20:  # Limit 20 aktywnych nawyków
                raise HTTPException(status_code=400, detail="Osiągnięto maksymalną liczbę nawyków (20)")

            # Dodaj nawyk
            cursor = await db.execute(
                "INSERT INTO habits (user_id, name, description, reward_coins) VALUES (?, ?, ?, ?)",
                (user_id, habit_data.name, habit_data.description, habit_data.reward_coins)
            )
            await db.commit()

            habit_id = cursor.lastrowid
            print(f"✅ Habit created with ID: {habit_id}")

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

    except Exception as e:
        print(f"❌ Error creating habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas tworzenia nawyku: {str(e)}")


@app.post("/api/habits/{habit_id}/complete")
async def complete_habit(habit_id: int, authorization: str = Header(None)):
    """Oznacz nawyk jako wykonany dzisiaj"""
    print(f"✅ Completing habit: {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if habit_id <= 0:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID nawyku")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                print(f"❌ Habit not found: {habit_id} for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Sprawdź czy nawyk nie został już wykonany dzisiaj
            cursor = await db.execute(
                "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = date('now')",
                (habit_id, user_id)
            )
            existing_completion = await cursor.fetchone()

            if existing_completion:
                print(f"❌ Habit already completed today: {habit_id}")
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
            print(f"✅ Habit completed! User {user_id} earned {habit['reward_coins']} coins")

            # Pobierz nową liczbę monet
            cursor = await db.execute(
                "SELECT coins FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            return {
                "message": f"Nawyk wykonany! Otrzymałeś {habit['reward_coins']} monet",
                "coins_earned": habit["reward_coins"],
                "total_coins": user["coins"] if user else 0
            }

    except Exception as e:
        print(f"❌ Error completing habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas oznaczania nawyku: {str(e)}")


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, authorization: str = Header(None)):
    """Usuń nawyk (oznacz jako nieaktywny)"""
    print(f"🗑️ Deleting habit: {habit_id}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if habit_id <= 0:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID nawyku")

    try:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("PRAGMA foreign_keys = ON")

            # Sprawdź czy nawyk należy do użytkownika
            cursor = await db.execute(
                "SELECT id FROM habits WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            habit = await cursor.fetchone()

            if not habit:
                print(f"❌ Habit not found: {habit_id} for user {user_id}")
                raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

            # Oznacz jako nieaktywny zamiast usuwać
            await db.execute(
                "UPDATE habits SET is_active = 0 WHERE id = ? AND user_id = ?",
                (habit_id, user_id)
            )
            await db.commit()

            print(f"✅ Habit deleted: {habit_id}")
            return {"message": "Nawyk został usunięty"}

    except Exception as e:
        print(f"❌ Error deleting habit: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Błąd podczas usuwania nawyku: {str(e)}")


# Additional debug endpoint for habits
@app.get("/api/debug/habits")
async def debug_habits():
    """Debug endpoint - sprawdź wszystkie nawyki"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM habits ORDER BY created_at DESC")
        habits = await cursor.fetchall()
        return {
            "habits": [dict(habit) for habit in habits],
            "count": len(habits)
        }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)