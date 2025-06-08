import os
import sys
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

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


# Nowe modele Pydantic dla karmienia
class FoodPurchase(BaseModel):
    food_id: int

class FoodResponse(BaseModel):
    id: int
    name: str
    cost: int
    nutrition_value: int
    icon: str

class PurchaseResponse(BaseModel):
    message: str
    food_name: str
    nutrition_gained: int
    total_coins: int
    habi_food_level: int


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

# CORS - Poprawka dla problemu z frontendem
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nadiahermann111.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "*"  # Podczas developmentu - usuń w produkcji
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Basic endpoints
@app.get("/")
async def root():
    return {"message": "Habi API działa!", "version": "1.0.0"}

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

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

# User endpoints
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
async def add_coins(data: dict, authorization: str = Header(None)):
    """Dodaj monety użytkownikowi (dla testów)"""
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
            "coins": user[0] if user else 0,
            "added": amount
        }

# Habit endpoints
@app.post("/api/habits")
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
        db.row_factory = aiosqlite.Row

        # Sprawdź czy kolumna icon istnieje, jeśli nie - dodaj ją
        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

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
    """Pobierz wszystkie nawyki użytkownika"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # Sprawdź czy kolumna icon istnieje
        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

        # Pobierz nawyki użytkownika z kompletami
        cursor = await db.execute(
            """SELECT h.id, h.name, h.description, h.reward_coins, h.is_active, h.created_at,
                      COALESCE(h.icon, '🎯') as icon,
                      GROUP_CONCAT(hc.completed_at) as completion_dates
               FROM habits h
               LEFT JOIN habit_completions hc ON h.id = hc.habit_id
               WHERE h.user_id = ? AND h.is_active = 1
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
        db.row_factory = aiosqlite.Row

        # Sprawdź czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT id, name, reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
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

        coins_earned = habit["reward_coins"]

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
        total_coins = user["coins"] if user else 0

        return {
            "message": f"Brawo! Wykonano nawyk '{habit['name']}'",
            "coins_earned": coins_earned,
            "total_coins": total_coins,
            "completion_date": today
        }

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

# Food/Rewards endpoints - NOWE
@app.get("/api/foods")
async def get_foods():
    """Pobierz wszystkie dostępne jedzenie dla Habi"""
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # Sprawdź czy tabela rewards istnieje, jeśli nie - utwórz ją
        await db.execute("""
            CREATE TABLE IF NOT EXISTS rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cost INTEGER NOT NULL,
                nutrition_value INTEGER NOT NULL,
                icon TEXT NOT NULL,
                type TEXT DEFAULT 'food' CHECK (type IN ('food', 'accessory'))
            )
        """)

        # Sprawdź czy są jakieś dane
        cursor = await db.execute("SELECT COUNT(*) FROM rewards")
        count = await cursor.fetchone()

        if count[0] == 0:
            # Dodaj domyślne jedzenie
            default_foods = [
                ("Woda", 1, 5, "🥤", "food"),
                ("Banan", 3, 15, "🍌", "food"),
                ("Jabłko", 3, 15, "🍎", "food"),
                ("Mięso", 8, 25, "🥩", "food"),
                ("Sałatka", 8, 25, "🥗", "food"),
                ("Kawa", 20, 40, "☕", "food")
            ]

            await db.executemany(
                "INSERT INTO rewards (name, cost, nutrition_value, icon, type) VALUES (?, ?, ?, ?, ?)",
                default_foods
            )
            await db.commit()

        # Pobierz wszystkie jedzenie
        cursor = await db.execute(
            "SELECT id, name, cost, nutrition_value, icon FROM rewards WHERE type = 'food' ORDER BY cost ASC"
        )
        foods = await cursor.fetchall()

        return [
            {
                "id": food["id"],
                "name": food["name"],
                "cost": food["cost"],
                "nutrition": food["nutrition_value"],
                "iconImage": food["icon"]
            }
            for food in foods
        ]

@app.post("/api/feed-habi")
async def feed_habi(purchase_data: FoodPurchase, authorization: str = Header(None)):
    """Kup jedzenie i nakarm Habi"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy jedzenie istnieje
        cursor = await db.execute(
            "SELECT id, name, cost, nutrition_value, icon FROM rewards WHERE id = ? AND type = 'food'",
            (purchase_data.food_id,)
        )
        food = await cursor.fetchone()

        if not food:
            raise HTTPException(status_code=404, detail="Jedzenie nie znalezione")

        # Sprawdź czy użytkownik ma wystarczająco monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        if user["coins"] < food["cost"]:
            raise HTTPException(
                status_code=400,
                detail=f"Za mało monet! Potrzebujesz {food['cost']}, masz {user['coins']}"
            )

        # Utwórz tabele jeśli nie istnieją
        await db.execute("""
            CREATE TABLE IF NOT EXISTS habi_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                food_level INTEGER DEFAULT 100,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id)
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS food_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                food_id INTEGER NOT NULL,
                cost INTEGER NOT NULL,
                nutrition_gained INTEGER NOT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (food_id) REFERENCES rewards (id)
            )
        """)

        # Pobierz obecny stan Habi
        cursor = await db.execute(
            "SELECT food_level, last_update FROM habi_status WHERE user_id = ?",
            (user_id,)
        )
        habi_status = await cursor.fetchone()

        current_food_level = 100
        if habi_status:
            # Oblicz spadek poziomu jedzenia na podstawie czasu
            from datetime import datetime
            last_update = datetime.fromisoformat(habi_status["last_update"])
            now = datetime.now()
            hours_passed = (now - last_update).total_seconds() / 3600

            # Spadek 5% co godzinę
            food_decay = int(hours_passed * 5)
            current_food_level = max(0, habi_status["food_level"] - food_decay)

        # Nakarm Habi (dodaj odżywianie)
        new_food_level = min(100, current_food_level + food["nutrition_value"])

        # Odejmij monety
        new_coins = user["coins"] - food["cost"]
        await db.execute(
            "UPDATE users SET coins = ? WHERE id = ?",
            (new_coins, user_id)
        )

        # Zaktualizuj stan Habi
        await db.execute("""
            INSERT OR REPLACE INTO habi_status (user_id, food_level, last_update)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (user_id, new_food_level))

        # Zapisz zakup
        await db.execute("""
            INSERT INTO food_purchases (user_id, food_id, cost, nutrition_gained)
            VALUES (?, ?, ?, ?)
        """, (user_id, food["id"], food["cost"], food["nutrition_value"]))

        await db.commit()

        return {
            "message": f"Brawo! Nakarmiłeś Habi",
            "food_name": food["name"],
            "nutrition_gained": food["nutrition_value"],
            "total_coins": new_coins,
            "habi_food_level": new_food_level,
            "cost": food["cost"]
        }

@app.get("/api/habi-status")
async def get_habi_status(authorization: str = Header(None)):
    """Pobierz aktualny stan Habi"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # Sprawdź czy tabela istnieje
        await db.execute("""
            CREATE TABLE IF NOT EXISTS habi_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                food_level INTEGER DEFAULT 100,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id)
            )
        """)

        # Pobierz stan Habi
        cursor = await db.execute(
            "SELECT food_level, last_update FROM habi_status WHERE user_id = ?",
            (user_id,)
        )
        habi_status = await cursor.fetchone()

        current_food_level = 100
        last_update = datetime.now().isoformat()

        if habi_status:
            # Oblicz spadek poziomu jedzenia
            from datetime import datetime
            last_update_dt = datetime.fromisoformat(habi_status["last_update"])
            now = datetime.now()
            hours_passed = (now - last_update_dt).total_seconds() / 3600

            # Spadek 5% co godzinę
            food_decay = int(hours_passed * 5)
            current_food_level = max(0, habi_status["food_level"] - food_decay)
            last_update = habi_status["last_update"]

            # Zaktualizuj w bazie jeśli minęła przynajmniej godzina
            if hours_passed >= 1:
                await db.execute("""
                    UPDATE habi_status 
                    SET food_level = ?, last_update = CURRENT_TIMESTAMP 
                    WHERE user_id = ?
                """, (current_food_level, user_id))
                await db.commit()
                last_update = datetime.now().isoformat()
        else:
            # Pierwszy raz - utwórz wpis
            await db.execute("""
                INSERT INTO habi_status (user_id, food_level, last_update)
                VALUES (?, 100, CURRENT_TIMESTAMP)
            """, (user_id,))
            await db.commit()

        return {
            "food_level": current_food_level,
            "last_update": last_update,
            "user_id": user_id
        }

@app.get("/api/feed-history")
async def get_feed_history(authorization: str = Header(None)):
    """Pobierz historię karmienia Habi"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("""
            SELECT 
                fp.id,
                fp.cost,
                fp.nutrition_gained,
                fp.purchased_at,
                r.name as food_name,
                r.icon
            FROM food_purchases fp
            JOIN rewards r ON fp.food_id = r.id
            WHERE fp.user_id = ?
            ORDER BY fp.purchased_at DESC
            LIMIT 20
        """, (user_id,))

        purchases = await cursor.fetchall()

        return [
            {
                "id": purchase["id"],
                "food_name": purchase["food_name"],
                "icon": purchase["icon"],
                "cost": purchase["cost"],
                "nutrition_gained": purchase["nutrition_gained"],
                "purchased_at": purchase["purchased_at"]
            }
            for purchase in purchases
        ]

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)