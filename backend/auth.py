from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

# Konfiguracja
SECRET_KEY = "super-secret-key-for-habi-app"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashuje hasło"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Sprawdza hasło"""
    return pwd_context.verify(plain_password, hashed_password)


def create_token(user_id: int) -> str:
    """Tworzy JWT token ważny 30 dni"""
    expire = datetime.utcnow() + timedelta(days=30)
    data = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow()  # Czas utworzenia tokenu
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> int:
    """Weryfikuje token i zwraca user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))

        if user_id is None:
            print("❌ Brak user_id w tokenie")
            return None

        return user_id

    except jwt.ExpiredSignatureError:
        print("❌ Token wygasł")
        return None
    except jwt.JWTError as e:
        print(f"❌ Błąd JWT: {e}")
        return None
    except ValueError as e:
        print(f"❌ Błąd konwersji user_id: {e}")
        return None
    except Exception as e:
        print(f"❌ Nieoczekiwany błąd weryfikacji tokenu: {e}")
        return None