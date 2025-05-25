import sqlite3
import asyncio
import aiosqlite
from pathlib import Path

DATABASE_PATH = "database.db"

# SQL do tworzenia tabel
CREATE_TABLES_SQL = """
                    -- Tabela użytkowników
                    CREATE TABLE IF NOT EXISTS users \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        username \
                        TEXT \
                        UNIQUE \
                        NOT \
                        NULL, \
                        email \
                        TEXT \
                        UNIQUE \
                        NOT \
                        NULL, \
                        password_hash \
                        TEXT \
                        NOT \
                        NULL, \
                        coins \
                        INTEGER \
                        DEFAULT \
                        0, \
                        created_at \
                        TIMESTAMP \
                        DEFAULT \
                        CURRENT_TIMESTAMP
                    );

-- Tabela nawyków
                    CREATE TABLE IF NOT EXISTS habits \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        user_id \
                        INTEGER \
                        NOT \
                        NULL, \
                        name \
                        TEXT \
                        NOT \
                        NULL, \
                        description \
                        TEXT, \
                        reward_coins \
                        INTEGER \
                        DEFAULT \
                        10, \
                        is_active \
                        BOOLEAN \
                        DEFAULT \
                        TRUE, \
                        created_at \
                        TIMESTAMP \
                        DEFAULT \
                        CURRENT_TIMESTAMP, \
                        FOREIGN \
                        KEY \
                    ( \
                        user_id \
                    ) REFERENCES users \
                    ( \
                        id \
                    ) ON DELETE CASCADE
                        );

-- Tabela wykonań nawyków
                    CREATE TABLE IF NOT EXISTS habit_completions \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        habit_id \
                        INTEGER \
                        NOT \
                        NULL, \
                        user_id \
                        INTEGER \
                        NOT \
                        NULL, \
                        completed_at \
                        DATE \
                        DEFAULT ( \
                        date \
                    ( \
                        'now' \
                    )),
                        coins_earned INTEGER NOT NULL,
                        FOREIGN KEY \
                    ( \
                        habit_id \
                    ) REFERENCES habits \
                    ( \
                        id \
                    ) ON DELETE CASCADE,
                        FOREIGN KEY \
                    ( \
                        user_id \
                    ) REFERENCES users \
                    ( \
                        id \
                    ) \
                      ON DELETE CASCADE,
                        UNIQUE \
                    ( \
                        habit_id, \
                        user_id, \
                        completed_at \
                    )
                        );

-- Tabela stanu małpki Habi
                    CREATE TABLE IF NOT EXISTS habi_status \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        user_id \
                        INTEGER \
                        UNIQUE \
                        NOT \
                        NULL, \
                        happiness_level \
                        INTEGER \
                        DEFAULT \
                        50 \
                        CHECK \
                    ( \
                        happiness_level \
                        >= \
                        0 \
                        AND \
                        happiness_level \
                        <= \
                        100 \
                    ),
                        hunger_level INTEGER DEFAULT 30 CHECK \
                    ( \
                        hunger_level \
                        >= \
                        0 \
                        AND \
                        hunger_level \
                        <= \
                        100 \
                    ),
                        last_fed TIMESTAMP,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY \
                    ( \
                        user_id \
                    ) REFERENCES users \
                    ( \
                        id \
                    ) ON DELETE CASCADE
                        );

-- Tabela nagród/jedzenia
                    CREATE TABLE IF NOT EXISTS rewards \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        name \
                        TEXT \
                        NOT \
                        NULL, \
                        cost \
                        INTEGER \
                        NOT \
                        NULL, \
                        happiness_boost \
                        INTEGER \
                        DEFAULT \
                        10, \
                        hunger_reduction \
                        INTEGER \
                        DEFAULT \
                        20, \
                        type \
                        TEXT \
                        DEFAULT \
                        'food' \
                        CHECK ( \
                        type \
                        IN \
                    ( \
                        'food', \
                        'accessory' \
                    ))
                        );

-- Tabela zakupów użytkowników
                    CREATE TABLE IF NOT EXISTS purchases \
                    ( \
                        id \
                        INTEGER \
                        PRIMARY \
                        KEY \
                        AUTOINCREMENT, \
                        user_id \
                        INTEGER \
                        NOT \
                        NULL, \
                        reward_id \
                        INTEGER \
                        NOT \
                        NULL, \
                        coins_spent \
                        INTEGER \
                        NOT \
                        NULL, \
                        purchased_at \
                        TIMESTAMP \
                        DEFAULT \
                        CURRENT_TIMESTAMP, \
                        FOREIGN \
                        KEY \
                    ( \
                        user_id \
                    ) REFERENCES users \
                    ( \
                        id \
                    ) ON DELETE CASCADE,
                        FOREIGN KEY \
                    ( \
                        reward_id \
                    ) REFERENCES rewards \
                    ( \
                        id \
                    )
                        ); \
                    """

# Przykładowe nagrody
DEFAULT_REWARDS = [
    ("Banan", 5, 10, 15, "food"),
    ("Jabłko", 3, 8, 12, "food"),
    ("Orzeszki", 8, 15, 20, "food"),
    ("Smoothie", 12, 20, 25, "food"),
    ("Ciasteczko", 10, 25, 10, "food")
]


async def init_database():
    """Inicjalizuje bazę danych i tworzy tabele"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Włącz foreign keys
        await db.execute("PRAGMA foreign_keys = ON")

        # Utwórz tabele
        await db.executescript(CREATE_TABLES_SQL)

        # Dodaj przykładowe nagrody jeśli baza jest pusta
        cursor = await db.execute("SELECT COUNT(*) FROM rewards")
        count = await cursor.fetchone()

        if count[0] == 0:
            await db.executemany(
                "INSERT INTO rewards (name, cost, happiness_boost, hunger_reduction, type) VALUES (?, ?, ?, ?, ?)",
                DEFAULT_REWARDS
            )

        await db.commit()


async def get_db():
    """Generator bazy danych dla dependency injection"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row  # Pozwala na dostęp po nazwie kolumny
        yield db


# Funkcje pomocnicze do wykonywania zapytań
async def execute_query(query: str, params: tuple = ()):
    """Wykonuje zapytanie i zwraca liczbę zmienionych wierszy"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        cursor = await db.execute(query, params)
        await db.commit()
        return cursor.rowcount


async def fetch_one(query: str, params: tuple = ()):
    """Pobiera jeden wiersz"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(query, params)
        return await cursor.fetchone()


async def fetch_all(query: str, params: tuple = ()):
    """Pobiera wszystkie wiersze"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(query, params)
        return await cursor.fetchall()


async def fetch_one_value(query: str, params: tuple = ()):
    """Pobiera jedną wartość"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        cursor = await db.execute(query, params)
        result = await cursor.fetchone()
        return result[0] if result else None