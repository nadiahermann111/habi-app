import os
import sys
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import List
import calendar
import asyncio

# importowanie modułów aplikacji
try:
    from database import init_db, update_habit_statistics, DATABASE_PATH

    print("database.py imported successfully")
    print(f"main.py uzywa bazy: {DATABASE_PATH}")
except Exception as e:
    print(f"Failed to import database.py: {e}")

try:
    import aiosqlite

    print("aiosqlite imported successfully")
except Exception as e:
    print(f"Failed to import aiosqlite: {e}")

try:
    from schemas import (
        UserRegister, UserLogin, UserResponse, LoginResponse,
        HabitCreate, HabitResponse, HabitUpdate, HabitCompletionResponse
    )

    print("schemas.py imported successfully")
except Exception as e:
    print(f"Failed to import schemas.py: {e}")

try:
    from auth import hash_password, verify_password, create_token, verify_token

    print("auth.py imported successfully")
except Exception as e:
    print(f"Failed to import auth.py: {e}")


async def ensure_clothing_column_exists():
    """
    Sprawdza i dodaje kolumnę current_clothing_id do tabeli users jeśli nie istnieje.

    Obsługuje race conditions gdy wiele procesów próbuje dodać kolumnę jednocześnie.
    """
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                # Sprawdź czy kolumna istnieje
                cursor = await db.execute("PRAGMA table_info(users)")
                columns = await cursor.fetchall()
                column_names = [column[1] for column in columns]

                if 'current_clothing_id' not in column_names:
                    print("Dodawanie kolumny current_clothing_id...")

                    try:
                        # Próba dodania kolumny
                        await db.execute("ALTER TABLE users ADD COLUMN current_clothing_id INTEGER DEFAULT NULL")
                        await db.commit()
                        print("Kolumna current_clothing_id dodana pomyslnie")
                        return

                    except Exception as alter_error:
                        # Sprawdź czy kolumna została dodana przez inny proces
                        cursor = await db.execute("PRAGMA table_info(users)")
                        columns = await cursor.fetchall()
                        column_names = [column[1] for column in columns]

                        if 'current_clothing_id' in column_names:
                            print("Kolumna current_clothing_id juz istnieje (dodana przez inny proces)")
                            return
                        else:
                            # Jeśli kolumny nadal nie ma, spróbuj ponownie
                            raise alter_error
                else:
                    print("Kolumna current_clothing_id juz istnieje")
                    return

        except Exception as e:
            retry_count += 1
            error_msg = str(e).lower()

            # Jeśli błąd to "duplicate column name" - kolumna już istnieje, wszystko OK
            if "duplicate column" in error_msg or "already exists" in error_msg:
                print("Kolumna current_clothing_id juz istnieje")
                return

            if retry_count < max_retries:
                print(f"Proba {retry_count} nie powiodla sie, ponawiam... ({e})")
                await asyncio.sleep(0.5)  # Krótkie opóźnienie przed retry
            else:
                print(f"Nie udalo sie dodac kolumny current_clothing_id po {max_retries} probach: {e}")
                # Nie przerywaj uruchamiania aplikacji - może kolumna już istnieje
                return


async def ensure_slot_machine_column_exists():
    """
    Sprawdza i dodaje kolumnę last_slot_machine_play do tabeli users jeśli nie istnieje.
    """
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                # Sprawdź czy kolumna istnieje
                cursor = await db.execute("PRAGMA table_info(users)")
                columns = await cursor.fetchall()
                column_names = [column[1] for column in columns]

                if 'last_slot_machine_play' not in column_names:
                    print("Dodawanie kolumny last_slot_machine_play...")

                    try:
                        await db.execute("ALTER TABLE users ADD COLUMN last_slot_machine_play DATE DEFAULT NULL")
                        await db.commit()
                        print("Kolumna last_slot_machine_play dodana pomyslnie")
                        return

                    except Exception as alter_error:
                        cursor = await db.execute("PRAGMA table_info(users)")
                        columns = await cursor.fetchall()
                        column_names = [column[1] for column in columns]

                        if 'last_slot_machine_play' in column_names:
                            print("Kolumna last_slot_machine_play juz istnieje (dodana przez inny proces)")
                            return
                        else:
                            raise alter_error
                else:
                    print("Kolumna last_slot_machine_play juz istnieje")
                    return

        except Exception as e:
            retry_count += 1
            error_msg = str(e).lower()

            if "duplicate column" in error_msg or "already exists" in error_msg:
                print("Kolumna last_slot_machine_play juz istnieje")
                return

            if retry_count < max_retries:
                print(f"Proba {retry_count} nie powiodla sie, ponawiam... ({e})")
                await asyncio.sleep(0.5)
            else:
                print(f"Nie udalo sie dodac kolumny last_slot_machine_play po {max_retries} probach: {e}")
                return


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
        print("Database initialized")

        # Dodaj kolumny jeśli nie istnieją
        await ensure_clothing_column_exists()
        await ensure_slot_machine_column_exists()

    except Exception as e:
        print(f"Database initialization failed: {e}")
        # Nie przerywaj - aplikacja może nadal działać

    yield

    # Zamykanie aplikacji
    print("Shutting down")


# inicjalizacja aplikacji FastAPI
app = FastAPI(
    title="Habi API",
    description="API dla aplikacji do sledzenia nawykow z wirtualna malpka",
    version="1.0.0",
    lifespan=lifespan
)

# konfiguracja CORS (mechanizm umożliwiający bezpieczny dostęp do zasobów) dla komunikacji z frontendem
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


# ============================================
# PODSTAWOWE ENDPOINTY I TESTY
# ============================================

@app.get("/")
async def root():
    """Główny endpoint sprawdzający czy API działa."""
    return {"message": "Habi API dziala!", "version": "1.0.0"}


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
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = await cursor.fetchall()
            return {
                "message": "Database works!",
                "tables": [table[0] for table in tables],
                "database_path": DATABASE_PATH
            }
    except Exception as e:
        return {
            "message": "Database error",
            "error": str(e)
        }


# ============================================
# ENDPOINTY UŻYTKOWNIKÓW
# ============================================

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
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # sprawdzenie unikalności emaila
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email juz jest zajety")

        # sprawdzenie czy nazwa użytkownika już istnieje w bazie
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username juz jest zajety")

        # tworzenie nowego użytkownika z zahashowanym hasłem
        hashed_password = hash_password(user_data.password)
        cursor = await db.execute(
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
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # wyszukanie użytkownika po emailu
        cursor = await db.execute(
            "SELECT id, username, email, password_hash, coins FROM users WHERE email = ?",
            (login_data.email,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo")

        # weryfikacja hasła
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo")

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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, username, email, coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    amount = data.get('amount', 0)

    if amount == 0:
        raise HTTPException(status_code=400, detail="Kwota nie moze byc rowna 0")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # sprawdzenie obecnej liczby monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

        current_coins = user["coins"]
        new_coins = current_coins + amount

        # walidacja przy wydawaniu monet
        if amount < 0 and current_coins < abs(amount):
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczajaco monet. Potrzebujesz {abs(amount)}, masz {current_coins}"
            )

        # zabezpieczenie przed ujemną liczbą monet
        if new_coins < 0:
            raise HTTPException(status_code=400, detail="Liczba monet nie moze byc ujemna")

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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    amount = data.get('amount', 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Kwota musi byc wieksza od 0")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # sprawdzenie czy użytkownik ma wystarczająco monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

        if user["coins"] < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Niewystarczajaco monet. Potrzebujesz {amount}, masz {user['coins']}"
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
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, coins, created_at FROM users")
        users = await cursor.fetchall()
        return {
            "users": [dict(user) for user in users]
        }


# ============================================
# ENDPOINTY NAWYKÓW
# ============================================

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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    # walidacja danych nawyku
    if not habit_data.name.strip():
        raise HTTPException(status_code=400, detail="Nazwa nawyku jest wymagana")

    if habit_data.coin_value < 1 or habit_data.coin_value > 5:
        raise HTTPException(status_code=400, detail="Wartosc monet musi byc miedzy 1 a 5")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

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
            "icon": habit["icon"] or "target",
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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        # pobranie nawyków użytkownika z datami ukończenia
        cursor = await db.execute(
            """SELECT h.id,
                      h.name,
                      h.description,
                      h.reward_coins,
                      h.is_active,
                      h.created_at,
                      COALESCE(h.icon, 'target')         as icon,
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
                "icon": habit["icon"] or "target",
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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    today = date.today().isoformat()

    async with aiosqlite.connect(DATABASE_PATH) as db:
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
            raise HTTPException(status_code=400, detail="Nawyk juz wykonany dzisiaj")

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

    # Aktualizacja statystyk (poza główną transakcją)
    await update_habit_statistics(user_id, habit_id, today)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # sprawdzenie czy nawyk istnieje i należy do użytkownika
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

        return {"message": "Nawyk usuniety pomyslnie"}


# ============================================
# ENDPOINTY DLA UBRAŃ
# ============================================

@app.get("/api/clothing")
async def get_clothing_items():
    """
    Pobiera wszystkie dostępne ubrania.

    Returns:
        list: Lista wszystkich ubrań w systemie
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, cost, icon, category FROM clothing_items ORDER BY cost ASC"
        )
        items = await cursor.fetchall()
        return [dict(item) for item in items]


@app.get("/api/clothing/owned")
async def get_owned_clothing(authorization: str = Header(None)):
    """
    Pobiera ubrania posiadane przez użytkownika + aktualnie noszone ubranie.

    WALIDACJA: Sprawdza czy current_clothing_id faktycznie należy do użytkownika.
    Jeśli nie - automatycznie czyści.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Lista ID posiadanych ubrań + ID aktualnie noszonego ubrania

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Pobierz posiadane ubrania
        cursor = await db.execute(
            "SELECT clothing_id FROM user_clothing WHERE user_id = ?",
            (user_id,)
        )
        owned = await cursor.fetchall()
        owned_clothing_ids = [item["clothing_id"] for item in owned]

        # Pobierz aktualnie noszone ubranie - z walidacją
        current_clothing_id = None
        try:
            cursor = await db.execute(
                "SELECT current_clothing_id FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()
            current_clothing_id = user["current_clothing_id"] if user else None

            # KLUCZOWA WALIDACJA: Sprawdź czy użytkownik faktycznie posiada to ubranie
            if current_clothing_id and current_clothing_id not in owned_clothing_ids:
                print(
                    f"WARNING: User {user_id} ma current_clothing_id={current_clothing_id} ktorego nie posiada - CZYSZCZENIE")

                # Automatycznie wyczyść nieprawidłowe ubranie
                await db.execute(
                    "UPDATE users SET current_clothing_id = NULL WHERE id = ?",
                    (user_id,)
                )
                await db.commit()
                current_clothing_id = None
                print(f"Wyczyszczono nieprawidlowe current_clothing_id dla user {user_id}")

        except Exception as e:
            print(f"Blad pobierania current_clothing_id: {e}")
            current_clothing_id = None

        return {
            "owned_clothing_ids": owned_clothing_ids,
            "current_clothing_id": current_clothing_id
        }


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
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
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
                detail=f"Juz posiadasz {clothing['name']}!"
            )

        # Sprawdzenie czy użytkownik ma wystarczająco monet
        cursor = await db.execute(
            "SELECT coins FROM users WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

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


@app.post("/api/clothing/wear/{clothing_id}")
async def wear_clothing(clothing_id: int, authorization: str = Header(None)):
    """
    Zmienia aktualnie noszone ubranie dla użytkownika.

    WALIDACJA: Sprawdza czy użytkownik faktycznie posiada to ubranie.

    Args:
        clothing_id (int): ID ubrania do założenia
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Potwierdzenie zmiany ubrania

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub użytkownik nie posiada ubrania
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy użytkownik posiada to ubranie
        cursor = await db.execute(
            "SELECT id FROM user_clothing WHERE user_id = ? AND clothing_id = ?",
            (user_id, clothing_id)
        )
        owned = await cursor.fetchone()

        if not owned:
            raise HTTPException(
                status_code=403,
                detail="Nie mozesz zalozyc ubrania, ktorego nie posiadasz"
            )

        # Zaktualizuj aktualnie noszone ubranie
        try:
            await db.execute(
                "UPDATE users SET current_clothing_id = ? WHERE id = ?",
                (clothing_id, user_id)
            )
            await db.commit()
            print(f"User {user_id} zalozyl ubranie {clothing_id}")
        except Exception as e:
            print(f"Blad aktualizacji current_clothing_id: {e}")
            # Jeśli kolumna nie istnieje, spróbuj ją dodać
            await ensure_clothing_column_exists()
            # Spróbuj ponownie
            await db.execute(
                "UPDATE users SET current_clothing_id = ? WHERE id = ?",
                (clothing_id, user_id)
            )
            await db.commit()

        # Pobierz nazwę ubrania dla potwierdzenia
        cursor = await db.execute(
            "SELECT name FROM clothing_items WHERE id = ?",
            (clothing_id,)
        )
        clothing = await cursor.fetchone()

        return {
            "message": f"Zalozono {clothing['name'] if clothing else 'ubranie'}",
            "current_clothing_id": clothing_id,
            "user_id": user_id
        }


@app.delete("/api/clothing/wear")
async def remove_clothing(authorization: str = Header(None)):
    """
    Usuwa aktualnie noszone ubranie (wraca do domyślnego wyglądu).

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Potwierdzenie zdjęcia ubrania

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")

        # Usuń aktualnie noszone ubranie
        try:
            await db.execute(
                "UPDATE users SET current_clothing_id = NULL WHERE id = ?",
                (user_id,)
            )
            await db.commit()
            print(f"User {user_id} zdjal ubranie")
        except Exception as e:
            print(f"Blad usuwania current_clothing_id: {e}")
            # Jeśli kolumna nie istnieje, to już domyślnie NULL

        return {
            "message": "Ubranie zdjete - powrot do domyslnego wygladu",
            "current_clothing_id": None
        }


# ============================================
# ENDPOINTY DLA AUTOMATU (SLOT MACHINE)
# ============================================

@app.get("/api/slot-machine/check")
async def check_slot_machine_limit(authorization: str = Header(None)):
    """
    Sprawdza czy użytkownik może dzisiaj grać w automat.

    Returns:
        dict: Informacja czy można grać, data ostatniej gry

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        try:
            cursor = await db.execute(
                "SELECT last_slot_machine_play FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

            last_play = user["last_slot_machine_play"]
            today = date.today()

            # Sprawdź czy ostatnia gra była dzisiaj
            can_play = True
            if last_play:
                last_play_date = date.fromisoformat(last_play) if isinstance(last_play, str) else last_play
                can_play = last_play_date < today

            return {
                "can_play": can_play,
                "last_play_date": str(last_play) if last_play else None,
                "next_available": str(today) if can_play else str(today)
            }

        except Exception as e:
            print(f"Blad sprawdzania limitu automatu: {e}")
            # Jeśli kolumna nie istnieje, spróbuj ją dodać
            await ensure_slot_machine_column_exists()
            # Domyślnie pozwól grać
            return {
                "can_play": True,
                "last_play_date": None,
                "next_available": str(date.today())
            }


@app.post("/api/slot-machine/play")
async def record_slot_machine_play(authorization: str = Header(None)):
    """
    Zapisuje że użytkownik zagrał dzisiaj w automat.

    Returns:
        dict: Potwierdzenie zapisu gry

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub użytkownik już dzisiaj grał
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    today = date.today()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        try:
            # Sprawdź czy użytkownik już dzisiaj grał
            cursor = await db.execute(
                "SELECT last_slot_machine_play FROM users WHERE id = ?",
                (user_id,)
            )
            user = await cursor.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="Uzytkownik nie znaleziony")

            last_play = user["last_slot_machine_play"]

            # Walidacja - czy już dzisiaj grał
            if last_play:
                last_play_date = date.fromisoformat(last_play) if isinstance(last_play, str) else last_play
                if last_play_date == today:
                    raise HTTPException(status_code=400, detail="Juz dzisiaj zagrales")

            # Zapisz dzisiejszą datę
            await db.execute(
                "UPDATE users SET last_slot_machine_play = ? WHERE id = ?",
                (today.isoformat(), user_id)
            )
            await db.commit()

            print(f"User {user_id} zagral w automat dnia {today}")

            return {
                "success": True,
                "message": "Gra zapisana",
                "play_date": str(today)
            }

        except HTTPException:
            raise
        except Exception as e:
            print(f"Blad zapisywania gry w automat: {e}")
            # Jeśli kolumna nie istnieje, spróbuj ją dodać
            await ensure_slot_machine_column_exists()

            # Spróbuj ponownie
            await db.execute(
                "UPDATE users SET last_slot_machine_play = ? WHERE id = ?",
                (today.isoformat(), user_id)
            )
            await db.commit()

            return {
                "success": True,
                "message": "Gra zapisana",
                "play_date": str(today)
            }


# ============================================
# ENDPOINTY DLA STATYSTYK NAWYKÓW
# ============================================

@app.get("/api/habits/statistics")
async def get_habit_statistics(authorization: str = Header(None)):
    """
    Pobiera statystyki nawyków użytkownika.

    Args:
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Statystyki wszystkich nawyków użytkownika

    Raises:
        HTTPException: Gdy token jest nieprawidłowy
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Pobierz statystyki
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

        # Pobierz wszystkie completion dates dla każdego nawyku
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
    """
    Pobiera dane kalendarza dla konkretnego nawyku w danym miesiącu.

    Args:
        habit_id (int): ID nawyku
        year (int): Rok
        month (int): Miesiąc (1-12)
        authorization (str): Token autoryzacyjny w headerze

    Returns:
        dict: Dane kalendarza z wykonaniami nawyku

    Raises:
        HTTPException: Gdy token jest nieprawidłowy lub nawyk nie istnieje
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Sprawdź czy nawyk należy do użytkownika
        cursor = await db.execute(
            "SELECT id, name, icon FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, user_id)
        )
        habit = await cursor.fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Nawyk nie znaleziony")

        # Pobierz wykonania dla danego miesiąca
        # Pierwszy i ostatni dzień miesiąca
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


# ============================================
# URUCHOMIENIE APLIKACJI
# ============================================

if __name__ == "__main__":
    """
    Uruchamia serwer aplikacji używając uvicorn.

    Port jest pobierany ze zmiennej środowiskowej PORT lub domyślnie ustawiony na 10000.
    Konfiguracja jest dostosowana do środowiska produkcyjnego (reload=False).
    """
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)