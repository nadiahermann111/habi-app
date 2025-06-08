"""
Plik do obsługi bazy danych SQLite dla aplikacji Habi.

Ten moduł zawiera definicje tabel, funkcje inicjalizacji bazy danych
oraz pomocnicze funkcje do wykonywania zapytań SQL.
"""

import sqlite3
import asyncio
import aiosqlite
from pathlib import Path

DATABASE_PATH = "database.db"

# definicje SQL do tworzenia wszystkich tabel aplikacji
CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    reward_coins INTEGER DEFAULT 1,
    icon TEXT DEFAULT '🎯',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    completed_at DATE DEFAULT (date('now')),
    coins_earned INTEGER NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (habit_id, user_id, completed_at)
);

CREATE TABLE IF NOT EXISTS habi_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    happiness_level INTEGER DEFAULT 50 CHECK (happiness_level >= 0 AND happiness_level <= 100),
    hunger_level INTEGER DEFAULT 30 CHECK (hunger_level >= 0 AND hunger_level <= 100),
    last_fed TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    nutrition_value INTEGER NOT NULL,
    icon TEXT DEFAULT '🍎',
    type TEXT DEFAULT 'food' CHECK (type IN ('food', 'accessory'))
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    coins_spent INTEGER NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
);
"""

# domyślne nagrody dodawane przy inicjalizacji bazy danych
DEFAULT_REWARDS = [
    ("Woda", 1, 5, "🥤", "food"),
    ("Banan", 3, 15, "🍌", "food"),
    ("Jabłko", 3, 15, "🍎", "food"),
    ("Mięso", 8, 25, "🥩", "food"),
    ("Sałatka", 8, 25, "🥗", "food"),
    ("Kawa", 20, 40, "☕", "food")
]


async def init_db():
    """
    Inicjalizuje bazę danych SQLite.

    Funkcja tworzy wszystkie wymagane tabele dla aplikacji Habi i dodaje
    domyślne nagrody jeśli baza danych jest pusta. Włącza również obsługę
    kluczy obcych dla zachowania integralności danych.

    Raises:
        sqlite3.Error: Gdy wystąpi błąd podczas tworzenia tabel
        aiosqlite.Error: Gdy wystąpi błąd połączenia z bazą danych

    Example:
        await init_db()
        ✅ Baza danych została zainicjalizowana pomyślnie
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # włączenie obsługi kluczy obcych
        await db.execute("PRAGMA foreign_keys = ON")

        # utworzenie wszystkich tabel
        await db.executescript(CREATE_TABLES_SQL)

        # sprawdzenie czy tabela rewards jest pusta
        cursor = await db.execute("SELECT COUNT(*) FROM rewards")
        count = await cursor.fetchone()

        # dodanie domyślnych nagród jeśli tabela jest pusta
        if count[0] == 0:
            await db.executemany(
                "INSERT INTO rewards (name, cost, nutrition_value, icon, type) VALUES (?, ?, ?, ?, ?)",
                DEFAULT_REWARDS
            )

        await db.commit()
        print("✅ Baza danych została zainicjalizowana pomyślnie")


async def get_db():
    """
    Generator bazy danych dla dependency injection w FastAPI.

    Tworzy połączenie z bazą danych z włączonymi kluczami obcymi
    i konfiguracją row_factory dla łatwiejszego dostępu do kolumn
    przez nazwę zamiast indeks.

    Yields:
        aiosqlite.Connection: Połączenie z bazą danych gotowe do użycia

    Example:
        async for db in get_db():
        ...    result = await db.execute("SELECT * FROM users")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row  # Dostęp do kolumn po nazwie
        yield db


#funkcje pomocnicze

async def execute_query(query: str, params: tuple = ()) -> int:
    """
    Wykonuje zapytanie SQL modyfikujące dane.

    Funkcja obsługuje zapytania typu INSERT, UPDATE, DELETE
    i zwraca liczbę zmienionych wierszy.

    Args:
        query (str): Zapytanie SQL do wykonania
        params (tuple, optional): Parametry zapytania. Domyślnie pusta krotka.

    Returns:
        int: Liczba zmienionych wierszy

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas wykonywania zapytania

    Example:
        count = await execute_query(
        ...     "INSERT INTO users (username, email) VALUES (?, ?)",
        ...     ("jan_kowalski", "jan@example.com")
        ... )
        print(f"Dodano {count} użytkownika")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        cursor = await db.execute(query, params)
        await db.commit()
        return cursor.rowcount


async def fetch_one(query: str, params: tuple = ()):
    """
    Pobiera jeden wiersz z bazy danych.

    Args:
        query (str): Zapytanie SQL SELECT
        params (tuple, optional): Parametry zapytania. Domyślnie pusta krotka.

    Returns:
        aiosqlite.Row | None: Pierwszy wiersz wyników lub None jeśli brak danych

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas wykonywania zapytania

    Example:
        >user = await fetch_one(
        ...     "SELECT * FROM users WHERE username = ?",
        ...     ("jan_kowalski",)
        ... )
       if user:
        ...     print(f"Znaleziono użytkownika: {user['username']}")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(query, params)
        return await cursor.fetchone()


async def fetch_all(query: str, params: tuple = ()):
    """
    Pobiera wszystkie wiersze z bazy danych.

    Args:
        query (str): Zapytanie SQL SELECT
        params (tuple, optional): Parametry zapytania. Domyślnie pusta krotka.

    Returns:
        List[aiosqlite.Row]: Lista wszystkich wierszy wyników

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas wykonywania zapytania

    Example:
        users = await fetch_all("SELECT * FROM users WHERE coins > ?", (10,))
        for user in users:
        ...     print(f"Użytkownik {user['username']} ma {user['coins']} monet")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(query, params)
        return await cursor.fetchall()


async def fetch_one_value(query: str, params: tuple = ()):
    """
    Pobiera jedną wartość z bazy danych.

    Zwraca pierwszą kolumnę pierwszego wiersza wyniku.
    Przydatne do zapytań agregujących typu COUNT(*), SUM(), MAX() itp.

    Args:
        query (str): Zapytanie SQL SELECT zwracające jedną wartość
        params (tuple, optional): Parametry zapytania. Domyślnie pusta krotka.

    Returns:
        Any | None: Wartość z pierwszej kolumny pierwszego wiersza lub None

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas wykonywania zapytania

    Example:
       total_users = await fetch_one_value("SELECT COUNT(*) FROM users")
       print(f"Łącznie użytkowników: {total_users}")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        cursor = await db.execute(query, params)
        result = await cursor.fetchone()
        return result[0] if result else None

#funkcje dla konkretnych działań

async def create_user_habi_status(user_id: int):
    """
    Tworzy początkowy status małpki Habi dla nowego użytkownika.

    Ustawia domyślne wartości szczęścia (50) i głodu (30) dla nowego użytkownika.

    Args:
        user_id (int): ID użytkownika dla którego tworzy się status Habi

    Returns:
        int: Liczba wstawionych wierszy (powinno być 1)

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas tworzenia statusu

    Example:
        user_id = 1
        result = await create_user_habi_status(user_id)
        print(f"Utworzono status Habi dla użytkownika {user_id}")
    """
    query = """
        INSERT INTO habi_status (user_id, happiness_level, hunger_level) 
        VALUES (?, 50, 30)
    """
    return await execute_query(query, (user_id,))


async def get_user_habits_with_completions(user_id: int):
    """
    Pobiera wszystkie aktywne nawyki użytkownika wraz z historią wykonań.

    Funkcja łączy tabele habits i habit_completions, aby zwrócić
    pełne informacje o nawykach wraz z datami ich wykonań.

    Args:
        user_id (int): ID użytkownika

    Returns:
        List[aiosqlite.Row]: Lista nawyków z następującymi kolumnami:
            - id: ID nawyku
            - name: Nazwa nawyku
            - description: Opis nawyku
            - reward_coins: Liczba monet za wykonanie
            - is_active: Czy nawyk jest aktywny
            - created_at: Data utworzenia
            - icon: Ikona nawyku
            - completion_dates: Daty wykonań (oddzielone przecinkami)

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas pobierania danych

    Example:
        habits = await get_user_habits_with_completions(1)
       for habit in habits:
        print(f"Nawyk: {habit['name']}, wykonania: {habit['completion_dates']}")
    """
    query = """
        SELECT h.id, h.name, h.description, h.reward_coins, h.is_active, h.created_at,
               COALESCE(h.icon, '🎯') as icon,
               GROUP_CONCAT(hc.completed_at) as completion_dates
        FROM habits h
        LEFT JOIN habit_completions hc ON h.id = hc.habit_id
        WHERE h.user_id = ? AND h.is_active = 1
        GROUP BY h.id, h.name, h.description, h.reward_coins, h.is_active, h.created_at, h.icon
        ORDER BY h.created_at DESC
    """
    return await fetch_all(query, (user_id,))


async def check_habit_completed_today(habit_id: int, user_id: int, today: str) -> bool:
    """
    Sprawdza czy dany nawyk został już wykonany dzisiaj.

    Args:
        habit_id (int): ID nawyku do sprawdzenia
        user_id (int): ID użytkownika
        today (str): Dzisiejsza data w formacie ISO (YYYY-MM-DD)

    Returns:
        bool: True jeśli nawyk został już wykonany dzisiaj, False w przeciwnym razie

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas sprawdzania

    Example:
        from datetime import date
        today = date.today().isoformat()
        is_completed = await check_habit_completed_today(1, 1, today)
        if is_completed:
        ...     print("Nawyk już wykonany dzisiaj!")
        ... else:
        ...     print("Nawyk jeszcze nie wykonany.")
    """
    query = """
        SELECT 1 FROM habit_completions 
        WHERE habit_id = ? AND user_id = ? AND completed_at = ?
    """
    result = await fetch_one_value(query, (habit_id, user_id, today))
    return result is not None