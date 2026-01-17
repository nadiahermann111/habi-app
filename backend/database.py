"""
Plik do obsługi bazy danych SQLite dla aplikacji Habi.

Ten moduł zawiera definicje tabel, funkcje inicjalizacji bazy danych
oraz pomocnicze funkcje do wykonywania zapytań SQL.
"""

import os
import sqlite3
import asyncio
import aiosqlite
from pathlib import Path
from datetime import datetime, timedelta, date

# ============================================
# KONFIGURACJA ŚCIEŻKI BAZY DANYCH
# ============================================

# ✅ Użyj Persistent Disk (/var/data) jeśli dostępny (Render),
# w przeciwnym razie użyj lokalnej ścieżki (development)
DATABASE_PATH = "/var/data/database.db" if os.path.exists("/var/data") else "database.db"

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("📂 KONFIGURACJA BAZY DANYCH:")
print(f"   Ścieżka: {DATABASE_PATH}")
print(f"   Typ: {'🔒 Persistent Disk (Render)' if '/var/data' in DATABASE_PATH else '💻 Local Development'}")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

# ============================================
# DEFINICJE SQL
# ============================================

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

CREATE TABLE IF NOT EXISTS clothing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_clothing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    clothing_id INTEGER NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clothing_id) REFERENCES clothing_items(id),
    UNIQUE (user_id, clothing_id)
);

CREATE TABLE IF NOT EXISTS habit_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    habit_id INTEGER NOT NULL,
    total_completions INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE (user_id, habit_id)
);
"""

# ============================================
# DANE DOMYŚLNE
# ============================================

DEFAULT_REWARDS = [
    ("Woda", 1, 5, "🥤", "food"),
    ("Banan", 3, 15, "🍌", "food"),
    ("Jabłko", 3, 15, "🍎", "food"),
    ("Mięso", 8, 25, "🥩", "food"),
    ("Sałatka", 8, 25, "🥗", "food"),
    ("Kawa", 20, 40, "☕", "food")
]

DEFAULT_CLOTHING = [
    ("Kolczyki", 50, "💎", "Biżuteria"),
    ("Kokardka", 50, "🎀", "Dodatki"),
    ("Opaska w Panterke", 70, "🐆", "Dodatki"),
    ("Kwiatek Hibiskus", 70, "🌺", "Dodatki"),
    ("Tatuaże", 100, "🦋", "Dekoracje"),
    ("Koszulka i❤️ Habi", 150, "👕", "Ubrania"),
    ("Koszulka Banan", 150, "🍌", "Ubrania"),
    ("Ogrodniczki", 200, "👗", "Ubrania"),
    ("Tajemnicza opcja", 300, "❓", "Specjalne"),
    ("Strój Playboy", 500, "🐰", "Premium")
]


# ============================================
# INICJALIZACJA BAZY DANYCH
# ============================================

async def init_db():
    """
    Inicjalizuje bazę danych SQLite.

    Funkcja tworzy wszystkie wymagane tabele dla aplikacji Habi i dodaje
    domyślne nagrody oraz ubrania jeśli baza danych jest pusta. Włącza również obsługę
    kluczy obcych dla zachowania integralności danych.

    Raises:
        sqlite3.Error: Gdy wystąpi błąd podczas tworzenia tabel
        aiosqlite.Error: Gdy wystąpi błąd połączenia z bazą danych

    Example:
        await init_db()
        ✅ Baza danych została zainicjalizowana pomyślnie
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Włączenie obsługi kluczy obcych
        await db.execute("PRAGMA foreign_keys = ON")

        # Utworzenie wszystkich tabel
        await db.executescript(CREATE_TABLES_SQL)
        print("✅ Tabele utworzone")

        # ============================================
        # MIGRACJE - Dodanie nowych kolumn
        # ============================================
        
        # Pobierz listę kolumn w tabeli users
        cursor = await db.execute("PRAGMA table_info(users)")
        columns = await cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # ✅ MIGRACJA 1: Dodaj kolumnę current_clothing_id
        if 'current_clothing_id' not in column_names:
            print("➕ Dodawanie kolumny current_clothing_id...")
            try:
                await db.execute("""
                    ALTER TABLE users 
                    ADD COLUMN current_clothing_id INTEGER DEFAULT NULL
                """)
                await db.commit()
                print("✅ Kolumna current_clothing_id dodana pomyślnie")
            except Exception as e:
                print(f"⚠️ Błąd przy dodawaniu kolumny current_clothing_id: {e}")
        else:
            print("✅ Kolumna current_clothing_id już istnieje")
        
        # ✅ MIGRACJA 2: Dodaj kolumnę last_slot_play
        if 'last_slot_play' not in column_names:
            print("➕ Dodawanie kolumny last_slot_play...")
            try:
                await db.execute("""
                    ALTER TABLE users 
                    ADD COLUMN last_slot_play TEXT DEFAULT NULL
                """)
                await db.commit()
                print("✅ Kolumna last_slot_play dodana pomyślnie")
            except Exception as e:
                print(f"⚠️ Błąd przy dodawaniu kolumny last_slot_play: {e}")
        else:
            print("✅ Kolumna last_slot_play już istnieje")

        # ============================================
        # INICJALIZACJA DANYCH DOMYŚLNYCH
        # ============================================

        # Sprawdzenie czy tabela rewards jest pusta
        cursor = await db.execute("SELECT COUNT(*) FROM rewards")
        count = await cursor.fetchone()

        # Dodanie domyślnych nagród jeśli tabela jest pusta
        if count[0] == 0:
            print("➕ Dodawanie domyślnych nagród...")
            await db.executemany(
                "INSERT INTO rewards (name, cost, nutrition_value, icon, type) VALUES (?, ?, ?, ?, ?)",
                DEFAULT_REWARDS
            )
            print("✅ Domyślne nagrody dodane")

        # Sprawdzenie czy tabela clothing_items jest pusta
        cursor = await db.execute("SELECT COUNT(*) FROM clothing_items")
        count = await cursor.fetchone()

        # Dodanie domyślnych ubrań jeśli tabela jest pusta
        if count[0] == 0:
            print("➕ Dodawanie domyślnych ubrań...")
            await db.executemany(
                "INSERT INTO clothing_items (name, cost, icon, category) VALUES (?, ?, ?, ?)",
                DEFAULT_CLOTHING
            )
            print("✅ Domyślne ubrania dodane")

        await db.commit()
        print("✅ Baza danych została zainicjalizowana pomyślnie")


# ============================================
# GENERATOR POŁĄCZENIA DO BAZY
# ============================================

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
            result = await db.execute("SELECT * FROM users")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        yield db


# ============================================
# FUNKCJE POMOCNICZE - ZAPYTANIA SQL
# ============================================

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
            "INSERT INTO users (username, email) VALUES (?, ?)",
            ("jan_kowalski", "jan@example.com")
        )
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
        user = await fetch_one(
            "SELECT * FROM users WHERE username = ?",
            ("jan_kowalski",)
        )
        if user:
            print(f"Znaleziono użytkownika: {user['username']}")
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
            print(f"Użytkownik {user['username']} ma {user['coins']} monet")
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


# ============================================
# FUNKCJE DLA UŻYTKOWNIKÓW
# ============================================

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


# ============================================
# FUNKCJE DLA NAWYKÓW
# ============================================

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
            print("Nawyk już wykonany dzisiaj!")
        else:
            print("Nawyk jeszcze nie wykonany.")
    """
    query = """
        SELECT 1 FROM habit_completions 
        WHERE habit_id = ? AND user_id = ? AND completed_at = ?
    """
    result = await fetch_one_value(query, (habit_id, user_id, today))
    return result is not None


# ============================================
# FUNKCJE DLA STATYSTYK NAWYKÓW
# ============================================

async def update_habit_statistics(user_id: int, habit_id: int, completion_date: str):
    """
    Aktualizuje statystyki nawyku po jego wykonaniu.

    Args:
        user_id (int): ID użytkownika
        habit_id (int): ID nawyku
        completion_date (str): Data wykonania w formacie ISO (YYYY-MM-DD)
        
    Returns:
        None
        
    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas aktualizacji
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row

        # Sprawdź czy statystyki dla tego nawyku już istnieją
        cursor = await db.execute(
            "SELECT * FROM habit_statistics WHERE user_id = ? AND habit_id = ?",
            (user_id, habit_id)
        )
        stats = await cursor.fetchone()

        if not stats:
            # Utwórz nowe statystyki
            await db.execute(
                """INSERT INTO habit_statistics 
                   (user_id, habit_id, total_completions, current_streak, longest_streak, last_completion_date)
                   VALUES (?, ?, 1, 1, 1, ?)""",
                (user_id, habit_id, completion_date)
            )
            print(f"✅ Utworzono nowe statystyki dla nawyku {habit_id}")
        else:
            # Aktualizuj istniejące statystyki
            total_completions = stats['total_completions'] + 1
            current_streak = stats['current_streak']
            longest_streak = stats['longest_streak']
            last_date = stats['last_completion_date']

            # Oblicz streak (seria wykonań)
            from datetime import datetime as dt
            if last_date:
                last_date_obj = dt.fromisoformat(last_date).date()
                current_date_obj = dt.fromisoformat(completion_date).date()
                days_diff = (current_date_obj - last_date_obj).days

                if days_diff == 1:
                    # Kontynuacja streaka
                    current_streak += 1
                elif days_diff > 1:
                    # Przerwany streak
                    current_streak = 1
                # days_diff == 0 oznacza że już było dzisiaj (nie powinno się zdarzyć)
            else:
                current_streak = 1

            # Aktualizuj najdłuższy streak
            if current_streak > longest_streak:
                longest_streak = current_streak

            await db.execute(
                """UPDATE habit_statistics 
                   SET total_completions = ?, 
                       current_streak = ?, 
                       longest_streak = ?,
                       last_completion_date = ?,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE user_id = ? AND habit_id = ?""",
                (total_completions, current_streak, longest_streak, completion_date, user_id, habit_id)
            )
            print(f"✅ Zaktualizowano statystyki dla nawyku {habit_id}: streak={current_streak}")

        await db.commit()


async def get_user_habit_statistics(user_id: int):
    """
    Pobiera statystyki wszystkich nawyków użytkownika.

    Args:
        user_id (int): ID użytkownika

    Returns:
        List[dict]: Lista statystyk nawyków z następującymi kluczami:
            - habit_id: ID nawyku
            - habit_name: Nazwa nawyku
            - habit_icon: Ikona nawyku
            - reward_coins: Monety za wykonanie
            - total_completions: Całkowita liczba wykonań
            - current_streak: Obecna seria wykonań
            - longest_streak: Najdłuższa seria wykonań
            - last_completion_date: Data ostatniego wykonania

    Raises:
        aiosqlite.Error: Gdy wystąpi błąd podczas pobierania danych

    Example:
        stats = await get_user_habit_statistics(1)
        for stat in stats:
            print(f"{stat['habit_name']}: {stat['total_completions']} wykonań")
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT 
                   hs.*,
                   h.name as habit_name,
                   h.icon as habit_icon,
                   h.reward_coins
               FROM habit_statistics hs
               JOIN habits h ON hs.habit_id = h.id
               WHERE hs.user_id = ? AND h.is_active = 1
               ORDER BY hs.total_completions DESC""",
            (user_id,)
        )
        stats = await cursor.fetchall()
        return [dict(row) for row in stats]


# ============================================
# FUNKCJE TESTOWE
# ============================================

async def test_database_connection():
    """
    Testuje połączenie z bazą danych.
    
    Returns:
        bool: True jeśli połączenie działa, False w przeciwnym razie
    """
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute("SELECT 1")
            result = await cursor.fetchone()
            print("✅ Połączenie z bazą danych działa")
            return True
    except Exception as e:
        print(f"❌ Błąd połączenia z bazą danych: {e}")
        return False


async def get_database_info():
    """
    Wyświetla informacje o bazie danych.
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Pobierz listę tabel
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = await cursor.fetchall()
        
        print("\n" + "="*50)
        print("📊 INFORMACJE O BAZIE DANYCH")
        print("="*50)
        print(f"Ścieżka: {DATABASE_PATH}")
        print(f"Liczba tabel: {len(tables)}")
        print("\nTabele:")
        
        for table in tables:
            table_name = table[0]
            cursor = await db.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = await cursor.fetchone()
            print(f"  - {table_name}: {count[0]} rekordów")
        
        print("="*50 + "\n")


# ============================================
# GŁÓWNA FUNKCJA (DO TESTOWANIA)
# ============================================

if __name__ == "__main__":
    """
    Uruchom testy modułu database.
    
    Użycie:
        python database.py
    """
    print("\n🚀 URUCHAMIANIE TESTÓW MODUŁU DATABASE\n")
    
    async def run_tests():
        # Test połączenia
        await test_database_connection()
        
        # Inicjalizacja bazy
        await init_db()
        
        # Informacje o bazie
        await get_database_info()
        
        print("✅ Wszystkie testy zakończone\n")
    
    # Uruchom testy
    asyncio.run(run_tests())