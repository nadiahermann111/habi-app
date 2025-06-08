import os
import sys
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import List, Optional  # Dodaj Optional do importów

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

# Struktura jedzenia - przenieś na górę przed definicjami klas
FOOD_ITEMS = {
    1: {"name": "Woda", "cost": 1, "nutrition": 5, "icon": "💧"},
    2: {"name": "Banan", "cost": 3, "nutrition": 15, "icon": "🍌"},
    3: {"name": "Jabłko", "cost": 3, "nutrition": 15, "icon": "🍎"},
    4: {"name": "Mięso", "cost": 8, "nutrition": 25, "icon": "🥩"},
    5: {"name": "Sałatka", "cost": 8, "nutrition": 25, "icon": "🥗"},
    6: {"name": "Kawa", "cost": 20, "nutrition": 40, "icon": "☕"}
}

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

# Basic endpoints
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

# ===== FEEDHABI ENDPOINTS =====

@app.post("/api/habi/feed")
async def feed_habi(data: dict, authorization: str = Header(None)):
    """Nakarm Habi - wydaj monety i zwiększ poziom najedzenia"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    food_id = data.get('food_id')
    quantity = data.get('quantity', 1)

    if food_id not in FOOD_ITEMS:
        raise HTTPException(status_code=400, detail="Nieprawidłowe jedzenie")

    food_item = FOOD_ITEMS[food_id]
    total_cost = food_item["cost"] * quantity
    total_nutrition = food_item["nutrition"] * quantity

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy użytkownik ma wystarczająco monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        if user["coins"] < total_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczająco monet. Potrzebujesz {total_cost}, masz {user['coins']}"
            )

        # Pobierz obecny stan Habi
        cursor = await db.execute(
            "SELECT hunger_level, happiness, last_fed FROM habi_status WHERE user_id = ?",
            (user_id,)
        )
        habi_status = await cursor.fetchone()

        current_hunger = 0
        current_happiness = 50

        if habi_status:
            current_hunger = habi_status["hunger_level"]
            current_happiness = habi_status["happiness"]

            # Sprawdź czy Habi nie był głodny za długo (obniż szczęście)
            if habi_status["last_fed"]:
                last_fed = datetime.fromisoformat(habi_status["last_fed"])
                hours_since_fed = (datetime.now() - last_fed).total_seconds() / 3600
                if hours_since_fed > 12:  # Po 12 godzinach bez jedzenia
                    happiness_penalty = min(20, int(hours_since_fed - 12))
                    current_happiness = max(0, current_happiness - happiness_penalty)

        # Oblicz nowy poziom najedzenia i szczęścia
        new_hunger = min(100, current_hunger + total_nutrition)
        happiness_bonus = total_nutrition // 10  # Bonus szczęścia za jedzenie
        new_happiness = min(100, current_happiness + happiness_bonus)

        # Aktualizuj monety użytkownika
        await db.execute(
            "UPDATE users SET coins = coins - ? WHERE id = ?",
            (total_cost, user_id)
        )

        # Zapisz transakcję karmienia
        await db.execute(
            """INSERT INTO feeding_history
               (user_id, food_id, food_name, quantity, cost_per_item, total_cost, nutrition_gained, fed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, food_id, food_item["name"], quantity, food_item["cost"],
             total_cost, total_nutrition, datetime.now().isoformat())
        )

        # Aktualizuj status Habi
        if habi_status:
            await db.execute(
                """UPDATE habi_status
                   SET hunger_level = ?, happiness = ?, last_fed = ?
                   WHERE user_id = ?""",
                (new_hunger, new_happiness, datetime.now().isoformat(), user_id)
            )
        else:
            await db.execute(
                """INSERT INTO habi_status (user_id, hunger_level, happiness, last_fed)
                   VALUES (?, ?, ?, ?)""",
                (user_id, new_hunger, new_happiness, datetime.now().isoformat())
            )

        await db.commit()

        # Pobierz nową liczbę monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        updated_user = await cursor.fetchone()

        return {
            "message": f"Habi zjadł {food_item['name']}!",
            "food_consumed": {
                "name": food_item["name"],
                "icon": food_item["icon"],
                "quantity": quantity,
                "nutrition": total_nutrition
            },
            "cost": total_cost,
            "remaining_coins": updated_user["coins"],
            "habi_status": {
                "hunger_level": new_hunger,
                "happiness": new_happiness,
                "last_fed": datetime.now().isoformat()
            }
        }

@app.get("/api/habi/status")
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

        cursor = await db.execute(
            "SELECT hunger_level, happiness, last_fed FROM habi_status WHERE user_id = ?",
            (user_id,)
        )
        habi_status = await cursor.fetchone()

        if not habi_status:
            # Nowy Habi - utwórz domyślny status
            await db.execute(
                "INSERT INTO habi_status (user_id, hunger_level, happiness, last_fed) VALUES (?, ?, ?, ?)",
                (user_id, 50, 80, datetime.now().isoformat())
            )
            await db.commit()
            return {
                "hunger_level": 50,
                "happiness": 80,
                "last_fed": datetime.now().isoformat(),
                "status_message": "Habi czeka na pierwsze karmienie!"
            }

        hunger = habi_status["hunger_level"]
        happiness = habi_status["happiness"]
        last_fed = habi_status["last_fed"]

        # Oblicz spadek głodu w czasie
        if last_fed:
            last_fed_time = datetime.fromisoformat(last_fed)
            hours_passed = (datetime.now() - last_fed_time).total_seconds() / 3600
            hunger_decay = int(hours_passed * 2)  # 2 punkty głodu na godzinę
            current_hunger = max(0, hunger - hunger_decay)

            # Aktualizuj hunger w bazie jeśli znacząco się zmienił
            if abs(current_hunger - hunger) > 5:
                await db.execute(
                    "UPDATE habi_status SET hunger_level = ? WHERE user_id = ?",
                    (current_hunger, user_id)
                )
                await db.commit()
                hunger = current_hunger

        # Określ status message
        if hunger < 20:
            status_message = "Habi jest bardzo głodny! 😢"
        elif hunger < 40:
            status_message = "Habi potrzebuje jedzenia 😐"
        elif hunger < 70:
            status_message = "Habi czuje się dobrze 😊"
        else:
            status_message = "Habi jest najedzony i szczęśliwy! 😄"

        return {
            "hunger_level": hunger,
            "happiness": happiness,
            "last_fed": last_fed,
            "status_message": status_message
        }

@app.get("/api/habi/feeding-history")
async def get_feeding_history(authorization: str = Header(None), limit: int = 10):
    """Pobierz historię karmienia Habi"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """SELECT food_name, quantity, total_cost, nutrition_gained, fed_at
               FROM feeding_history
               WHERE user_id = ?
               ORDER BY fed_at DESC LIMIT ?""",
            (user_id, limit)
        )
        history = await cursor.fetchall()

        return {
            "feeding_history": [
                {
                    "food_name": record["food_name"],
                    "quantity": record["quantity"],
                    "cost": record["total_cost"],
                    "nutrition": record["nutrition_gained"],
                    "fed_at": record["fed_at"]
                }
                for record in history
            ]
        }

@app.get("/api/food-items")
async def get_food_items():
    """Pobierz listę dostępnych produktów żywnościowych"""
    return {
        "food_items": [
            {
                "id": food_id,
                "name": item["name"],
                "cost": item["cost"],
                "nutrition": item["nutrition"],
                "icon": item["icon"]
            }
            for food_id, item in FOOD_ITEMS.items()
        ]
    }

@app.post("/api/habi/reset")
async def reset_habi_status(authorization: str = Header(None)):
    """Reset stanu Habi (tylko dla testów)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute(
            """INSERT OR REPLACE INTO habi_status (user_id, hunger_level, happiness, last_fed)
               VALUES (?, ?, ?, ?)""",
            (user_id, 50, 80, datetime.now().isoformat())
        )
        await db.commit()

        return {
            "message": "Stan Habi został zresetowany",
            "hunger_level": 50,
            "happiness": 80
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)