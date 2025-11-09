import os
import sys
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import List

#importowanie modułów aplikacji
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Zarządza cyklem życia aplikacji FastAPI.

    Wykonuje inicjalizację bazy danych podczas uruchamiania
    i czyści zasoby podczas zamykania aplikacji.
    """
    # uruchamianie aplikacji
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    yield
    # Zamykanie aplikacji
    print("👋 Shutting down")


#inicjalizacja aplikacji FastAPI
app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do śledzenia nawyków z wirtualną małpką",
    version="1.0.0",
    lifespan=lifespan
)

#konfiguracja CORS (mechanizm umożliwiający bezpieczny dostęp do zasobów) dla komunikacji z frontendem
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


#podstawowe endpointy i testy

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
    """
    Testuje połączenie z bazą danych.

    Returns:
        dict: Status połączenia i lista tabel w bazie danych
    """
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


#endpointy użytkowników

@app.post("/api/register", response_model=LoginResponse)
async def register(user_data: UserRegister):
    """
    Rejestruje nowego użytkownika w systemie.

    Args:
        user_data (UserRegister): Dane rejestracyjne użytkownika

    Returns:
        LoginResponse: Token autoryzacyjny i dane użytkownika

    Raises:
        HTTPException: Gdy email lub username już istnieje
    """
    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # sprawdzenie unikalności emaila
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email już jest zajęty")

        # sprawdzenie czy nazwa użytkownika już istnieje w bazie
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username już jest zajęty")

        # tworzenie nowego użytkownika z zahashowanym hasłem
        hashed_password = hash_password(user_data.password)
        cursor = await db.execute( #ORM - poszukać, SQL ALCHEMY
            "INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)",
            (user_data.username, user_data.email, hashed_password, 20)
        )
        await db.commit()

        user_id = cursor.lastrowid

        # pobranie danych utworzonego użytkownika
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        # generowanie tokenu autoryzacyjnego i przypisanie id userowi
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
    """
    Loguje użytkownika do systemu.

    Args:
        login_data (UserLogin): Dane logowania (email i hasło)

    Returns:
        LoginResponse: Token autoryzacyjny i dane użytkownika

    Raises:
        HTTPException: Gdy dane logowania są nieprawidłowe
    """
    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # wyszukanie użytkownika po emailu
        cursor = await db.execute(
            "SELECT id, username, email, password_hash, coins FROM users WHERE email = ?",
            (login_data.email,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # weryfikacja hasła
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

        # generowanie tokenu autoryzacyjnego
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
    """
    Pobiera profil zalogowanego użytkownika.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        UserResponse: Dane profilu użytkownika

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub użytkownik nie istnieje
    """
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
    """
    Pobiera aktualną liczbę monet użytkownika.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Liczba monet i ID użytkownika

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub użytkownik nie istnieje
    """
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
    """
    Dodaje lub odejmuje monety użytkownika.

    Obsługuje zarówno dodatnie wartości jak i ujemne, gdy użytkownik kupuje nagrody.

    Args:
        data (dict): Słownik zawierający pole 'amount' z liczbą monet
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Informacja o zmianie, nowa liczba monet i kwota zmiany

    Raises:
        HTTPException: Gdy token jest nieprawidłowy, kwota to 0,
                      lub użytkownik ma niewystarczająco monet
    """
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

        # sprawdzenie obecnej liczby monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

        current_coins = user["coins"]
        new_coins = current_coins + amount

        # walidacja przy wydawaniu monet
        if amount < 0 and current_coins < abs(amount):
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczająco monet. Potrzebujesz {abs(amount)}, masz {current_coins}"
            )

        # zabezpieczenie przed ujemną liczbą monet
        if new_coins < 0:
            raise HTTPException(status_code=400, detail="Liczba monet nie może być ujemna")

        # aktualizacja liczby monet
        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        # pobranie zaktualizowanej liczby monet
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
    """
    Wydaje monety użytkownika (dla funkcji FeedHabi).

    Args:
        data (dict): Słownik zawierający pole 'amount' z liczbą monet do wydania
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Informacja o wydatku, pozostała liczba monet

    Raises:
        HTTPException: Gdy token jest nieprawidłowy, kwota <= 0,
                      lub użytkownik ma niewystarczająco monet
    """
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

        # sprawdzenie czy użytkownik ma wystarczająco monet
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

        # odjęcie monet
        await db.execute(
            "UPDATE users SET coins = coins - ? WHERE id = ?",
            (amount, user_id)
        )
        await db.commit()

        # pobranie nowej liczby monet
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
    """
    Pobiera listę wszystkich użytkowników w systemie.

    Returns:
        dict: Lista użytkowników z ich podstawowymi danymi
    """
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, coins, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users]
        }


#endpointy nawyków

@app.post("/api/habits")
async def create_habit(habit_data: HabitCreate, authorization: str = Header(None)):
    """
    Tworzy nowy nawyk dla zalogowanego użytkownika.

    Args:
        habit_data (HabitCreate): Dane nowego nawyku
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Dane utworzonego nawyku

    Raises:
        HTTPException: Gdy token jest nieprawidłowy, nazwa nawyku jest pusta,
                      lub wartość monet jest poza zakresem 1-5
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    # walidacja danych nawyku
    if not habit_data.name.strip():
        raise HTTPException(status_code=400, detail="Nazwa nawyku jest wymagana")

    if habit_data.coin_value < 1 or habit_data.coin_value > 5:
        raise HTTPException(status_code=400, detail="Wartość monet musi być między 1 a 5")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # sprawdzenie i dodanie kolumny icon jeśli nie istnieje
        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

        # dodanie nowego nawyku do bazy danych
        cursor = await db.execute(
            """INSERT INTO habits (user_id, name, description, reward_coins, icon, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, habit_data.name, habit_data.description, habit_data.coin_value,
             habit_data.icon, True, datetime.now().isoformat())
        )
        await db.commit()

        habit_id = cursor.lastrowid

        # pobranie utworzonego nawyku
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
    """
    Pobiera wszystkie aktywne nawyki zalogowanego użytkownika wraz z datami ukończenia.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        list: Lista nawyków użytkownika z datami ukończenia

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row

        # sprawdzenie i dodanie kolumny jeśli nie istnieje
        try:
            cursor = await db.execute("PRAGMA table_info(habits)")
            columns = await cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'icon' not in column_names:
                await db.execute("ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '🎯'")
                await db.commit()
        except Exception as e:
            print(f"Error checking/adding icon column: {e}")

        # pobranie nawyków użytkownika z datami ukończenia
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
    """
    Oznacza nawyk jako wykonany w dzisiejszym dniu i przyznaje monety.

    Args:
        habit_id (int): ID nawyku do wykonania
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Informacja o wykonaniu nawyku, zarobione monety i nowa suma monet

    Raises:
        HTTPException: Gdy token jest nieprawidłowy, nawyk nie istnieje,
                      lub nawyk już został wykonany dzisiaj
    """
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

        # sprawdzenie czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT id, name, reward_coins FROM habits WHERE id = ? AND user_id = ? AND is_active = 1",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # sprawdzenie czy nawyk nie został już wykonany
        cursor = await db.execute(
            "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_at = ?",
            (habit_id, user_id, today)
        )
        existing_completion = await cursor.fetchone()

        if existing_completion:
            raise HTTPException(status_code=400, detail="Nawyk już wykonany dzisiaj")

        coins_earned = habit["reward_coins"]

        # dodanie wpisu o wykonaniu nawyku
        await db.execute(
            "INSERT INTO habit_completions (habit_id, user_id, completed_at, coins_earned) VALUES (?, ?, ?, ?)",
            (habit_id, user_id, today, coins_earned)
        )

        # dodanie monet do konta użytkownika
        await db.execute(
            "UPDATE users SET coins = coins + ? WHERE id = ?",
            (coins_earned, user_id)
        )

        await db.commit()

        # pobranie nowej liczby monet użytkownika
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
    """
    Usuwa nawyk użytkownika (oznacza jako nieaktywny).

    Nawyk nie jest fizycznie usuwany z bazy danych, tylko oznaczany jako nieaktywny
    w celu zachowania integralności danych historycznych.

    Args:
        habit_id (int): ID nawyku do usunięcia
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Potwierdzenie usunięcia nawyku

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub nawyk nie istnieje
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")

        #sprawdzenie czy nawyk istnieje i należy do użytkownika
        cursor = await db.execute(
            "SELECT id FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # oznaczenie nawyku jako nieaktywny
        await db.execute(
            "UPDATE habits SET is_active = 0 WHERE id = ?",
            (habit_id,)
        )
        await db.commit()

        return {"message": "Nawyk usunięty pomyślnie"}


# Endpointy dla ubrań

@app.get("/api/clothing")
async def get_clothing_items():
    """
    Pobiera wszystkie dostępne ubrania.

    Returns:
        list: Lista wszystkich ubrań w systemie
    """
    async with aiosqlite.connect("database.db") as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, cost, icon, category FROM clothing_items ORDER BY cost ASC"
        )
        items = await cursor.fetchall()
        return [dict(item) for item in items]


@app.get("/api/clothing/owned")
async def get_owned_clothing(authorization: str = Header(None)):
    """
    Pobiera ubrania posiadane przez użytkownika.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Lista ID posiadanych ubrań

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
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
        return {"owned_clothing_ids": [item["clothing_id"] for item in owned]}


@app.post("/api/clothing/purchase/{clothing_id}")
async def purchase_clothing(clothing_id: int, authorization: str = Header(None)):
    """
    Kupuje ubranie dla użytkownika.

    Args:
        clothing_id (int): ID ubrania do zakupu
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Potwierdzenie zakupu, pozostałe monety i nazwa przedmiotu

    Raises:
        HTTPException: Gdy token jest nieprawidłowy, przedmiot nie istnieje,
                      użytkownik już posiada przedmiot, lub ma za mało monet
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

    async with aiosqlite.connect("database.db") as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdzenie czy przedmiot istnieje
        cursor = await db.execute(
            "SELECT id, name, cost, icon FROM clothing_items WHERE id = ?",
            (clothing_id,)
        )
        clothing = await cursor.fetchone()

        if not clothing:
            raise HTTPException(status_code=404, detail="Przedmiot nie znaleziony")

        # Sprawdzenie czy użytkownik już posiada ten przedmiot
        cursor = await db.execute(
            "SELECT id FROM user_clothing WHERE user_id = ? AND clothing_id = ?",
            (user_id, clothing_id)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Już posiadasz {clothing['name']}!"
            )

        # Sprawdzenie czy użytkownik ma wystarczająco monet
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

        # Odjęcie monet
        await db.execute(
            "UPDATE users SET coins = coins - ? WHERE id = ?",
            (clothing["cost"], user_id)
        )

        # Dodanie przedmiotu do garderoby użytkownika
        await db.execute(
            "INSERT INTO user_clothing (user_id, clothing_id) VALUES (?, ?)",
            (user_id, clothing_id)
        )

        await db.commit()

        # Pobranie nowej liczby monet
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


if __name__ == "__main__":
    """
    Uruchamia serwer aplikacji używając uvicorn.

    Port jest pobierany ze zmiennej środowiskowej PORT lub domyślnie ustawiony na 10000.
    Konfiguracja jest dostosowana do środowiska produkcyjnego (reload=False).
    """
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)