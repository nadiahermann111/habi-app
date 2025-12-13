import os
import sys
from fastapi import FastAPI, HTTPException, Header, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from typing import List, Optional
import calendar
import secrets
from jose import jwt, JWTError

# importowanie modułów aplikacji
try:
    from database import init_db, update_habit_statistics

    print("✅ database.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import database.py: {e}")

try:
    import aiosqlite

    print("✅ aiosqlite imported successfully")
except Exception as e:
    print(f"❌ Failed to import aiosqlite: {e}")

try:
    from schemas import (
        UserRegister, UserLogin, UserResponse, LoginResponse,
        HabitCreate, HabitResponse, HabitUpdate, HabitCompletionResponse
    )

    print("✅ schemas.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import schemas.py: {e}")

try:
    from auth import hash_password, verify_password, create_token, verify_token

    print("✅ auth.py imported successfully")
except Exception as e:
    print(f"❌ Failed to import auth.py: {e}")

# ========================================
# KONFIGURACJA SESJI
# ========================================

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-super-secret-key-change-this-in-production")


def create_session_tokens(user_id: int):
    """
    Tworzy parę tokenów: access token (krótkotrwały) i refresh token (długotrwały)
    """
    # Access token - ważny 1 godzinę
    access_payload = {
        "user_id": user_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm="HS256")

    # Refresh token - ważny 30 dni
    refresh_payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm="HS256")

    # Session token - unikalny identyfikator sesji
    session_token = secrets.token_urlsafe(32)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "session_token": session_token
    }


async def save_session(user_id: int, session_token: str, refresh_token: str, device_info: str = None):
    """
    Zapisuje sesję w bazie danych
    """
    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        now = datetime.utcnow()
        expires_at = now + timedelta(days=30)

        await db.execute("""
                         INSERT INTO user_sessions
                         (user_id, session_token, refresh_token, created_at, expires_at, last_used_at, device_info,
                          is_active)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                         """, (
                             user_id,
                             session_token,
                             refresh_token,
                             now.isoformat(),
                             expires_at.isoformat(),
                             now.isoformat(),
                             device_info
                         ))
        await db.commit()


async def verify_session(session_token: str):
    """
    Weryfikuje czy sesja jest aktywna
    """
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("""
                                  SELECT user_id, expires_at, is_active
                                  FROM user_sessions
                                  WHERE session_token = ?
                                  """, (session_token,))

        session = await cursor.fetchone()

        if not session:
            return None

        if not session["is_active"]:
            return None

        expires_at = datetime.fromisoformat(session["expires_at"])
        if datetime.utcnow() > expires_at:
            return None

        # Aktualizuj last_used_at
        await db.execute("""
                         UPDATE user_sessions
                         SET last_used_at = ?
                         WHERE session_token = ?
                         """, (datetime.utcnow().isoformat(), session_token))
        await db.commit()

        return session["user_id"]


# ========================================
# LIFECYCLE APLIKACJI
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Zarządza cyklem życia aplikacji FastAPI.
    """
    # uruchamianie aplikacji
    try:
        await init_db()
        print("✅ Database initialized")

        async with aiosqlite.connect("database.db") as db:
            # Sprawdź i dodaj kolumnę current_clothing_id
            try:
                cursor = await db.execute("PRAGMA table_info(users)")
                columns = await cursor.fetchall()
                column_names = [column[1] for column in columns]

                if 'current_clothing_id' not in column_names:
                    print("➕ Dodawanie kolumny current_clothing_id...")
                    await db.execute("ALTER TABLE users ADD COLUMN current_clothing_id INTEGER DEFAULT NULL")
                    await db.commit()
                    print("✅ Kolumna current_clothing_id dodana pomyślnie")
                else:
                    print("✅ Kolumna current_clothing_id już istnieje")
            except Exception as e:
                print(f"⚠️ Błąd przy sprawdzaniu/dodawaniu kolumny: {e}")

            # Utwórz tabelę dla trwałych sesji
            try:
                await db.execute("""
                                 CREATE TABLE IF NOT EXISTS user_sessions
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
                                     session_token
                                     TEXT
                                     UNIQUE
                                     NOT
                                     NULL,
                                     refresh_token
                                     TEXT
                                     UNIQUE
                                     NOT
                                     NULL,
                                     created_at
                                     TEXT
                                     NOT
                                     NULL,
                                     expires_at
                                     TEXT
                                     NOT
                                     NULL,
                                     last_used_at
                                     TEXT
                                     NOT
                                     NULL,
                                     device_info
                                     TEXT,
                                     is_active
                                     INTEGER
                                     DEFAULT
                                     1,
                                     FOREIGN
                                     KEY
                                 (
                                     user_id
                                 ) REFERENCES users
                                 (
                                     id
                                 ) ON DELETE CASCADE
                                     )
                                 """)
                await db.commit()
                print("✅ Tabela user_sessions utworzona/sprawdzona")
            except Exception as e:
                print(f"⚠️ Błąd przy tworzeniu tabeli sesji: {e}")

    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    yield
    # Zamykanie aplikacji
    print("👋 Shutting down")


# ========================================
# INICJALIZACJA APLIKACJI
# ========================================

app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)

# konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nadiahermann111.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# PODSTAWOWE ENDPOINTY
# ========================================

@app.get("/")
async def root():
    """Główny endpoint sprawdzający czy API działa."""
    return {"message": "Habi API działa!", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    """Endpoint sprawdzający stan API."""
    return {"status": "OK"}


@app.get("/api/test-db")
async def test_db():
    """Testuje połączenie z bazą danych."""
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


# ========================================
# ENDPOINTY UŻYTKOWNIKÓW
# ========================================

@app.post("/api/register", response_model=LoginResponse)
async def register(user_data: UserRegister, response: Response):
    """
    Rejestruje nowego użytkownika z trwałą sesją.
    """
    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź email
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email już jest zajęty")

        # Sprawdź username
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username już jest zajęty")

        # Utwórz użytkownika
        hashed_password = hash_password(user_data.password)
        cursor = await db.execute(
            "INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)",
            (user_data.username, user_data.email, hashed_password, 20)
        )
        await db.commit()

        user_id = cursor.lastrowid

        # Pobierz dane użytkownika
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

    # Utwórz tokeny sesji
    tokens = create_session_tokens(user_id)

    # Zapisz sesję w bazie
    await save_session(user_id, tokens["session_token"], tokens["refresh_token"])

    # Ustaw cookies
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60  # 30 dni
    )

    response.set_cookie(
        key="session_token",
        value=tokens["session_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60
    )

    return LoginResponse(
        message="Rejestracja udana",
        token=tokens["access_token"],
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            coins=user["coins"]
        )
    )


@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: UserLogin, response: Response):
    """
    Loguje użytkownika z trwałą sesją.
    """
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
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # Weryfikuj hasło
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        user_id = user["id"]

    # Utwórz tokeny sesji
    tokens = create_session_tokens(user_id)

    # Zapisz sesję w bazie
    await save_session(user_id, tokens["session_token"], tokens["refresh_token"])

    # Ustaw cookies
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60
    )

    response.set_cookie(
        key="session_token",
        value=tokens["session_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60
    )

    return LoginResponse(
        message="Logowanie udane",
        token=tokens["access_token"],
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            coins=user["coins"]
        )
    )


@app.post("/api/refresh")
async def refresh_token(
        refresh_token: Optional[str] = Cookie(None),
        session_token: Optional[str] = Cookie(None)
):
    """
    Odświeża wygasły access token używając refresh tokenu.
    """
    if not refresh_token or not session_token:
        raise HTTPException(status_code=401, detail="Brak tokenów sesji")

    try:
        # Weryfikuj refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Nieprawidłowy typ tokenu")

        user_id = payload.get("user_id")

        # Sprawdź czy sesja istnieje i jest aktywna
        async with aiosqlite.connect("database.db") as db:
            db.row_factory = aiosqlite.Row

            cursor = await db.execute("""
                                      SELECT user_id, is_active, expires_at
                                      FROM user_sessions
                                      WHERE session_token = ?
                                        AND refresh_token = ?
                                      """, (session_token, refresh_token))

            session = await cursor.fetchone()

            if not session or not session["is_active"]:
                raise HTTPException(status_code=401, detail="Sesja nieaktywna lub nie istnieje")

            expires_at = datetime.fromisoformat(session["expires_at"])
            if datetime.utcnow() > expires_at:
                raise HTTPException(status_code=401, detail="Sesja wygasła")

        # Utwórz nowy access token
        new_access_token = jwt.encode({
            "user_id": user_id,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }, SECRET_KEY, algorithm="HS256")

        # Aktualizuj last_used_at
        async with aiosqlite.connect("database.db") as db:
            await db.execute("""
                             UPDATE user_sessions
                             SET last_used_at = ?
                             WHERE session_token = ?
                             """, (datetime.utcnow().isoformat(), session_token))
            await db.commit()

        return {
            "access_token": new_access_token,
            "message": "Token odświeżony pomyślnie"
        }

    except JWTError as e:
        # Obsługa wszystkich błędów JWT (wygasły token, nieprawidłowy token, itp.)
        error_msg = str(e)
        if "expired" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Refresh token wygasł")
        else:
            raise HTTPException(status_code=401, detail="Nieprawidłowy refresh token")


@app.post("/api/logout")
async def logout(
        session_token: Optional[str] = Cookie(None),
        response: Response = None
):
    """
    Wylogowuje użytkownika i usuwa sesję.
    """
    if session_token:
        async with aiosqlite.connect("database.db") as db:
            await db.execute("""
                             UPDATE user_sessions
                             SET is_active = 0
                             WHERE session_token = ?
                             """, (session_token,))
            await db.commit()

    # Usuń cookies
    response.delete_cookie("refresh_token")
    response.delete_cookie("session_token")

    return {"message": "Wylogowano pomyślnie"}


@app.get("/api/sessions")
async def get_user_sessions(authorization: str = Header(None)):
    """
    Pobiera listę aktywnych sesji użytkownika.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("""
                                  SELECT id, device_info, created_at, last_used_at, expires_at
                                  FROM user_sessions
                                  WHERE user_id = ?
                                    AND is_active = 1
                                  ORDER BY last_used_at DESC
                                  """, (user_id,))

        sessions = await cursor.fetchall()

        return {
            "sessions": [
                {
                    "id": s["id"],
                    "device": s["device_info"] or "Nieznane urządzenie",
                    "created_at": s["created_at"],
                    "last_used": s["last_used_at"],
                    "expires_at": s["expires_at"]
                }
                for s in sessions
            ]
        }


@app.delete("/api/sessions/{session_id}")
async def revoke_session(session_id: int, authorization: str = Header(None)):
    """
    Usuwa konkretną sesję (wylogowanie z urządzenia).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        # Sprawdź czy sesja należy do użytkownika
        cursor = await db.execute("""
                                  SELECT id
                                  FROM user_sessions
                                  WHERE id = ?
                                    AND user_id = ?
                                  """, (session_id, user_id))

        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Sesja nie znaleziona")

        # Dezaktywuj sesję
        await db.execute("""
                         UPDATE user_sessions
                         SET is_active = 0
                         WHERE id = ?
                         """, (session_id,))
        await db.commit()

        return {"message": "Sesja usunięta pomyślnie"}


@app.get("/api/profile", response_model=UserResponse)
async def get_profile(authorization: str = Header(None)):
    """Pobiera profil zalogowanego użytkownika."""
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

        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            coins=user["coins"]
        )


@app.get("/api/coins")
async def get_user_coins(authorization: str = Header(None)):
    """Pobiera aktualną liczbę monet użytkownika."""
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
async def add_coins(data: dict, authorization: str = Header(None)):
    """Dodaje lub odejmuje monety użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    amount = data.get('amount', 0)

    if amount == 0:
        raise HTTPException(status_code=400, detail="Kwota nie może być równa 0")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        current_coins = user["coins"]
        new_coins = current_coins + amount

        if amount < 0 and current_coins < abs(amount):
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczająco monet. Potrzebujesz {abs(amount)}, masz {current_coins}"
            )

        if new_coins < 0:
            raise HTTPException(status_code=400, detail="Liczba monet nie może być ujemna")

        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        updated_user = await cursor.fetchone()

        action = "Dodano" if amount > 0 else "Wydano"
        abs_amount = abs(amount)

        return {
            "message": f"{action} {abs_amount} monet",
            "coins": updated_user["coins"],
            "change": amount
        }


@app.post("/api/coins/spend")
async def spend_coins(data: dict, authorization: str = Header(None)):
    """Wydaje monety użytkownika (dla funkcji FeedHabi)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    amount = data.get('amount', 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Kwota musi być większa od 0")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        if user["coins"] < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczająco monet. Potrzebujesz {amount}, masz {user['coins']}"
            )

        await db.execute(
            "UPDATE users SET coins = coins - ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        updated_user = await cursor.fetchone()

        return {
            "message": f"Wydano {amount} monet",
            "remaining_coins": updated_user["coins"],
            "spent": amount
        }


@app.get("/api/users")
async def get_users():
    """Pobiera listę wszystkich użytkowników w systemie."""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, coins, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users]
        }


# ========================================
# ENDPOINTY NAWYKÓW
# ========================================

@app.post("/api/habits")
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """Tworzy nowy nawyk dla zalogowanego użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    if not habit_data.name.strip():
        raise HTTPException(status_code=400, detail="Nazwa nawyku jest wymagana")

    if habit_data.coin_value < 1 or habit_data.coin_value > 5:
        raise HTTPException(status_code=400, detail="Wartość monet musi być między 1 a 5")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

        cursor = await db.execute(
            """INSERT INTO habits (user_id, name, description, reward_coins, icon, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, habit_data.name, habit_data.description, habit_data.coin_value,
             habit_data.icon, True, datetime.now().isoformat())
        )
        await db.commit()

        habit_id = cursor.lastrowid

        cursor = await db.execute(
            "SELECT id, user_id, name, description, reward_coins, is_active, created_at, icon FROM habits WHERE id = ?",
            (habit_id,)
        )
        habit = await cursor.fetchone()

        return {
            "id": habit["id"],
            "name": habit["name"],
            "description": habit["description"] or "",
            "coin_value": habit["reward_coins"],
            "icon": habit["icon"] or "🎯",
            "is_active": bool(habit["is_active"]),
            "created_at": habit["created_at"],
            "completion_dates": []
        }


@app.get("/api/habits")
async def get_user_habits(authorization: str = Header(None)):
    """Pobiera wszystkie aktywne nawyki zalogowanego użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

        cursor = await db.execute(
            """SELECT h.id,
                      h.name,
                      h.description,
                      h.reward_coins,
                      h.is_active,
                      h.created_at,
                      COALESCE(h.icon, '🎯')         as icon,
                      GROUP_CONCAT(hc.completed_at) as completion_dates
               FROM habits h
                        LEFT JOIN habit_completions hc ON h.id = hc.habit_id
               WHERE h.user_id = ?
                 AND h.is_active = 1
               GROUP BY h.id, h.name, h.description, h.reward_coins, h.is_active, h.created_at, h.icon
               ORDER BY h.created_at DESC""",
            (user_id,)
        )
        habits = await cursor.fetchall()

        result = []
        for habit in habits:
            completion_dates = []
            if habit["completion_dates"]:
                completion_dates = habit["completion_dates"].split(",")

            result.append({
                "id": habit["id"],
                "name": habit["name"],
                "description": habit["description"] or "",
                "coin_value": habit["reward_coins"],
                "icon": habit["icon"] or "🎯",
                "is_active": bool(habit["is_active"]),
                "created_at": habit["created_at"],
                "completion_dates": completion_dates
            })

        return result


@app.post("/api/habits/{habit_id}/complete")
async def complete_habit(habit_id: int, authorization: str = Header(None)):
    """Oznacza nawyk jako wykonany w dzisiejszym dniu."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    today = date.today().isoformat()

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT id, name, reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        cursor = await db.execute(
            "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = ?",
            (habit_id, user_id, today)
        )
        existing_completion = await cursor.fetchone()

        if existing_completion:
            raise HTTPException(status_code=400, detail="Nawyk już wykonany dzisiaj")

        coins_earned = habit["reward_coins"]

        await db.execute(
            "INSERT INTO habit_completions (habit_id, user_id, completed_at, coins_earned) VALUES (?, ?, ?, ?)",
            (habit_id, user_id, today, coins_earned)
        )

        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (coins_earned, user_id)
        )

        await db.commit()

    await update_habit_statistics(user_id, habit_id, today)

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()
        total_coins = user["coins"] if user else 0

        return {
            "message": f"Brawo! Wykonano nawyk '{habit['name']}'",
            "coins_earned": coins_earned,
            "total_coins": total_coins,
            "completion_date": today
        }


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, authorization: str = Header(None)):
    """Usuwa nawyk użytkownika (oznacza jako nieaktywny)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        cursor = await db.execute(
            "SELECT id FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        await db.execute(
            "UPDATE habits SET is_active = 0 WHERE id = ?",
            (habit_id,)
        )
        await db.commit()

        return {"message": "Nawyk usunięty pomyślnie"}


# ========================================
# ENDPOINTY UBRAŃ
# ========================================

@app.get("/api/clothing")
async def get_clothing_items():
    """Pobiera wszystkie dostępne ubrania."""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, cost, icon, category FROM clothing_items ORDER BY cost ASC"
        )
        items = await cursor.fetchall()
        return [dict(item) for item in items]


@app.get("/api/clothing/owned")
async def get_owned_clothing(authorization: str = Header(None)):
    """Pobiera ubrania posiadane przez użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT clothing_id FROM user_clothing WHERE user_id = ?",
            (user_id,)
        )
        owned = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT current_clothing_id FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        return {
            "owned_clothing_ids": [item["clothing_id"] for item in owned],
            "current_clothing_id": user["current_clothing_id"] if user else None
        }


@app.post("/api/clothing/purchase/{clothing_id}")
async def purchase_clothing(clothing_id: int, authorization: str = Header(None)):
    """Kupuje ubranie dla użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT id, name, cost, icon FROM clothing_items WHERE id = ?",
            (clothing_id,)
        )
        clothing = await cursor.fetchone()

        if not clothing:
            raise HTTPException(status_code=404, detail="Przedmiot nie znaleziony")

        cursor = await db.execute(
            "SELECT id FROM user_clothing WHERE user_id = ? AND clothing_id = ?",
            (user_id, clothing_id)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Już posiadasz {clothing['name']}!"
            )

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        if user["coins"] < clothing["cost"]:
            raise HTTPException(
                status_code=400,
                detail=f"Potrzebujesz {clothing['cost']} monet, ale masz tylko {user['coins']}!"
            )

        await db.execute(
            "UPDATE users SET coins = coins - ? WHERE id = ?",
            (clothing["cost"], user_id)
        )

        await db.execute(
            "INSERT INTO user_clothing (user_id, clothing_id) VALUES (?, ?)",
            (user_id, clothing_id)
        )

        await db.commit()

        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        updated_user = await cursor.fetchone()

        return {
            "message": f"Zakupiono {clothing['name']}!",
            "item_name": clothing["name"],
            "item_icon": clothing["icon"],
            "cost": clothing["cost"],
            "remaining_coins": updated_user["coins"]
        }


@app.post("/api/clothing/wear/{clothing_id}")
async def wear_clothing(clothing_id: int, authorization: str = Header(None)):
    """Zmienia aktualnie noszone ubranie."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT id FROM user_clothing WHERE user_id = ? AND clothing_id = ?",
            (user_id, clothing_id)
        )
        owned = await cursor.fetchone()

        if not owned:
            raise HTTPException(
                status_code=403,
                detail="Nie możesz założyć ubrania, którego nie posiadasz"
            )

        await db.execute(
            "UPDATE users SET current_clothing_id = ? WHERE id = ?",
            (clothing_id, user_id)
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT name FROM clothing_items WHERE id = ?",
            (clothing_id,)
        )
        clothing = await cursor.fetchone()

        return {
            "message": f"Założono {clothing['name'] if clothing else 'ubranie'}",
            "current_clothing_id": clothing_id,
            "user_id": user_id
        }


@app.delete("/api/clothing/wear")
async def remove_clothing(authorization: str = Header(None)):
    """Usuwa aktualnie noszone ubranie."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        await db.execute(
            "UPDATE users SET current_clothing_id = NULL WHERE id = ?",
            (user_id,)
        )
        await db.commit()

        return {
            "message": "Ubranie zdjęte - powrót do domyślnego wyglądu",
            "current_clothing_id": None
        }


# ========================================
# ENDPOINTY STATYSTYK
# ========================================

@app.get("/api/habits/statistics")
async def get_habit_statistics(authorization: str = Header(None)):
    """Pobiera statystyki nawyków użytkownika."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """SELECT hs.*,
                      h.name as habit_name,
                      h.icon as habit_icon,
                      h.reward_coins
               FROM habit_statistics hs
                        JOIN habits h ON hs.habit_id = h.id
               WHERE hs.user_id = ?
                 AND h.is_active = 1
               ORDER BY hs.total_completions DESC""",
            (user_id,)
        )
        stats = await cursor.fetchall()

        habits_with_completions = []
        for stat in stats:
            cursor = await db.execute(
                """SELECT completed_at
                   FROM habit_completions
                   WHERE habit_id = ?
                     AND user_id = ?
                   ORDER BY completed_at DESC LIMIT 365""",
                (stat['habit_id'], user_id)
            )
            completions = await cursor.fetchall()
            completion_dates = [row['completed_at'] for row in completions]

            habits_with_completions.append({
                'habit_id': stat['habit_id'],
                'habit_name': stat['habit_name'],
                'habit_icon': stat['habit_icon'],
                'reward_coins': stat['reward_coins'],
                'total_completions': stat['total_completions'],
                'current_streak': stat['current_streak'],
                'longest_streak': stat['longest_streak'],
                'last_completion_date': stat['last_completion_date'],
                'completion_dates': completion_dates
            })

        return {
            'statistics': habits_with_completions,
            'total_habits': len(habits_with_completions),
            'total_completions': sum(h['total_completions'] for h in habits_with_completions)
        }


@app.get("/api/habits/{habit_id}/calendar")
async def get_habit_calendar(habit_id: int, year: int, month: int, authorization: str = Header(None)):
    """Pobiera dane kalendarza dla konkretnego nawyku."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT id, name, icon FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        first_day = date(year, month, 1)
        last_day = date(year, month, calendar.monthrange(year, month)[1])

        cursor = await db.execute(
            """SELECT completed_at
               FROM habit_completions
               WHERE habit_id = ?
                 AND user_id = ?
                 AND completed_at >= ?
                 AND completed_at <= ?
               ORDER BY completed_at""",
            (habit_id, user_id, first_day.isoformat(), last_day.isoformat())
        )
        completions = await cursor.fetchall()
        completion_dates = [row['completed_at'] for row in completions]

        return {
            'habit_id': habit['id'],
            'habit_name': habit['name'],
            'habit_icon': habit['icon'],
            'year': year,
            'month': month,
            'completion_dates': completion_dates,
            'total_completions_this_month': len(completion_dates)
        }


# ========================================
# URUCHOMIENIE APLIKACJI
# ========================================

if __name__ == "__main__":
    """Uruchamia serwer aplikacji używając uvicorn."""
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)