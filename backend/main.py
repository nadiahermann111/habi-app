import os
import sys
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

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


# TUTAJ tworzymy app PRZED użyciem @app
app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
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


# TERAZ możemy używać @app (app jest już zdefiniowane)
@app.get("/")
async def root():
    return {"message": "Habi API działa!", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "OK"}


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


@app.post("/api/register", response_model=LoginResponse)
async def register(user_data: UserRegister):
    """Rejestracja użytkownika"""
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

        # Pobierz utworzonego użytkownika
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        # Utwórz token
        token = create_token(user_id)

        return LoginResponse(
            message="Rejestracja udana",
            token=token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                coins=user["coins"]
            )
        )


@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    """Logowanie użytkownika"""
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

        # Sprawdź hasło
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # Utwórz token
        token = create_token(user["id"])

        return LoginResponse(
            message="Logowanie udane",
            token=token,
            user=UserResponse(
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


@app.get("/api/profile", response_model=UserResponse)
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

        return UserResponse(
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


@app.post("/api/habits", response_model=HabitResponse)
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """Stwórz nowy nawyk"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    # Walidacja danych
    if not habit_data.name.strip():
        raise HTTPException(status_code=400, detail="Nazwa nawyku jest wymagana")

    if habit_data.coin_value < 1 or habit_data.coin_value > 5:
        raise HTTPException(status_code=400, detail="Wartość monet musi być między 1 a 5")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Dodaj nawyk do bazy
        cursor = await db.execute(
            """INSERT INTO habits (user_id, name, description, reward_coins, icon, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, habit_data.name, habit_data.description, habit_data.coin_value,
             habit_data.icon, True, datetime.now().isoformat())
        )
        await db.commit()

        habit_id = cursor.lastrowid

        # Pobierz utworzony nawyk
        cursor = await db.execute(
            "SELECT * FROM habits WHERE id = ?",
            (habit_id,)
        )
        habit = await cursor.fetchone()

        return HabitResponse(
            id=habit[0],
            name=habit[2],
            description=habit[3],
            coin_value=habit[4],
            icon=habit[7] if len(habit) > 7 else "🎯",
            is_active=bool(habit[5]),
            created_at=habit[6],
            completion_dates=[]
        )


@app.get("/api/habits", response_model=List[HabitResponse])
async def get_user_habits(authorization: str = Header(None)):
    """Pobierz wszystkie nawyki użytkownika"""
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
                      GROUP_CONCAT(hc.completed_at) as completion_dates
               FROM habits h
                        LEFT JOIN habit_completions hc ON h.id = hc.habit_id
               WHERE h.user_id = ?
                 AND h.is_active = 1
               GROUP BY h.id
               ORDER BY h.created_at DESC""",
            (user_id,)
        )
        habits = await cursor.fetchall()

        result = []
        for habit in habits:
            completion_dates = []
            if habit["completion_dates"]:
                completion_dates = habit["completion_dates"].split(",")

            result.append(HabitResponse(
                id=habit["id"],
                name=habit["name"],
                description=habit["description"] or "",
                coin_value=habit["reward_coins"],
                icon=habit.get("icon", "🎯"),
                is_active=bool(habit["is_active"]),
                created_at=habit["created_at"],
                completion_dates=completion_dates
            ))

        return result


@app.post("/api/habits/{habit_id}/complete", response_model=HabitCompletionResponse)
async def complete_habit(habit_id: int, authorization: str = Header(None)):
    """Oznacz nawyk jako wykonany dzisiaj"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    today = date.today().isoformat()

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Sprawdź czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT * FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # Sprawdź czy już wykonano dzisiaj
        cursor = await db.execute(
            "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = ?",
            (habit_id, user_id, today)
        )
        existing_completion = await cursor.fetchone()

        if existing_completion:
            raise HTTPException(status_code=400, detail="Nawyk już wykonany dzisiaj")

        coins_earned = habit[4]  # reward_coins

        # Dodaj wykonanie nawyku
        await db.execute(
            "INSERT INTO habit_completions (habit_id, user_id, completed_at, coins_earned) VALUES (?, ?, ?, ?)",
            (habit_id, user_id, today, coins_earned)
        )

        # Dodaj monety użytkownikowi
        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (coins_earned, user_id)
        )

        await db.commit()

        # Pobierz nową liczbę monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()
        total_coins = user[0] if user else 0

        return HabitCompletionResponse(
            message=f"Brawo! Wykonano nawyk '{habit[2]}'",
            coins_earned=coins_earned,
            total_coins=total_coins,
            completion_date=today
        )


@app.get("/api/habits/{habit_id}")
async def get_habit(habit_id: int, authorization: str = Header(None)):
    """Pobierz szczegóły konkretnego nawyku"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # Pobierz nawyk z datami wykonań
        cursor = await db.execute(
            """SELECT h.*,
                      GROUP_CONCAT(hc.completed_at) as completion_dates
               FROM habits h
                        LEFT JOIN habit_completions hc ON h.id = hc.habit_id
               WHERE h.id = ?
                 AND h.user_id = ?
               GROUP BY h.id""",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        completion_dates = []
        if habit["completion_dates"]:
            completion_dates = habit["completion_dates"].split(",")

        return HabitResponse(
            id=habit["id"],
            name=habit["name"],
            description=habit["description"] or "",
            coin_value=habit["reward_coins"],
            icon=habit.get("icon", "🎯"),
            is_active=bool(habit["is_active"]),
            created_at=habit["created_at"],
            completion_dates=completion_dates
        )


@app.put("/api/habits/{habit_id}")
async def update_habit(habit_id: int, habit_data: HabitUpdate, authorization: str = Header(None)):
    """Zaktualizuj nawyk"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Sprawdź czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT id FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # Przygotuj dane do aktualizacji
        update_fields = []
        update_values = []

        if habit_data.name is not None:
            if not habit_data.name.strip():
                raise HTTPException(status_code=400, detail="Nazwa nawyku nie może być pusta")
            update_fields.append("name = ?")
            update_values.append(habit_data.name)

        if habit_data.description is not None:
            update_fields.append("description = ?")
            update_values.append(habit_data.description)

        if habit_data.coin_value is not None:
            if habit_data.coin_value < 1 or habit_data.coin_value > 5:
                raise HTTPException(status_code=400, detail="Wartość monet musi być między 1 a 5")
            update_fields.append("reward_coins = ?")
            update_values.append(habit_data.coin_value)

        if habit_data.icon is not None:
            update_fields.append("icon = ?")
            update_values.append(habit_data.icon)

        if habit_data.is_active is not None:
            update_fields.append("is_active = ?")
            update_values.append(habit_data.is_active)

        if not update_fields:
            raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

        # Wykonaj aktualizację
        update_values.append(habit_id)
        await db.execute(
            f"UPDATE habits SET {', '.join(update_fields)} WHERE id = ?",
            update_values
        )
        await db.commit()

        return {"message": "Nawyk zaktualizowany pomyślnie"}


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, authorization: str = Header(None)):
    """Usuń nawyk (oznacz jako nieaktywny)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Sprawdź czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT id FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # Oznacz jako nieaktywny zamiast usuwać
        await db.execute(
            "UPDATE habits SET is_active = 0 WHERE id = ?",
            (habit_id,)
        )
        await db.commit()

        return {"message": "Nawyk usunięty pomyślnie"}


@app.get("/api/habits/stats")
async def get_habit_stats(authorization: str = Header(None)):
    """Pobierz statystyki nawyków użytkownika"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # Liczba aktywnych nawyków
        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM habits WHERE user_id = ? AND is_active = 1",
            (user_id,)
        )
        active_habits = await cursor.fetchone()

        # Liczba wykonań dzisiaj
        today = date.today().isoformat()
        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM habit_completions WHERE user_id = ? AND completed_at = ?",
            (user_id, today)
        )
        completed_today = await cursor.fetchone()

        # Suma monet zarobionych dzisiaj
        cursor = await db.execute(
            "SELECT COALESCE(SUM(coins_earned), 0) as total FROM habit_completions WHERE user_id = ? AND completed_at = ?",
            (user_id, today)
        )
        coins_today = await cursor.fetchone()

        # Najdłuższa seria (streak) - przykładowa implementacja
        cursor = await db.execute(
            """SELECT habit_id, COUNT(*) as streak
               FROM habit_completions
               WHERE user_id = ?
               GROUP BY habit_id
               ORDER BY streak DESC LIMIT 1""",
            (user_id,)
        )
        longest_streak = await cursor.fetchone()

        return {
            "active_habits": active_habits["count"],
            "completed_today": completed_today["count"],
            "coins_earned_today": coins_today["total"],
            "longest_streak": longest_streak["streak"] if longest_streak else 0
        }

if __name__ == "__main__":
    import uvicorn

    # Port dla Render
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)