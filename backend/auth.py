"""
============================================
MODUŁ ZARZĄDZANIA AUTORYZACJĄ (BACKEND)
============================================

Centralne miejsce do zarządzania:
- Haszowaniem i weryfikacją haseł
- Tworzeniem i weryfikacją tokenów JWT
- Autoryzacją użytkowników
- Pomocniczymi funkcjami bezpieczeństwa
"""

import os
from jose import jwt, JWTError  # python-jose zamiast PyJWT
from passlib.context import CryptContext  # passlib zamiast bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from fastapi import HTTPException, Header

# ============================================
# KONFIGURACJA
# ============================================

# Klucz sekretny do podpisywania tokenów JWT
# W produkcji MUSI być w zmiennej środowiskowej!
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "twoj-super-tajny-klucz-zmien-mnie-w-produkcji")

# Algorytm używany do podpisywania tokenów
JWT_ALGORITHM = "HS256"

# Czas ważności tokenu (w dniach)
TOKEN_EXPIRATION_DAYS = 30

# Minimalna długość hasła
MIN_PASSWORD_LENGTH = 6

# Konfiguracja passlib dla bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================
# FUNKCJE HASZOWANIA HASEŁ
# ============================================

def hash_password(password: str) -> str:
    """
    Haszuje hasło używając bcrypt (poprzez passlib).

    Args:
        password (str): Hasło w postaci plaintext

    Returns:
        str: Zahaszowane hasło

    Example:
        >>> hashed = hash_password("moje_haslo123")
        >>> print(hashed)
        '$2b$12$...'
    """
    if not password:
        raise ValueError("Hasło nie może być puste")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Hasło musi mieć co najmniej {MIN_PASSWORD_LENGTH} znaków")

    # Haszowanie hasła używając passlib
    hashed = pwd_context.hash(password)

    return hashed


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Weryfikuje czy podane hasło pasuje do zahaszowanego hasła.

    Args:
        plain_password (str): Hasło w postaci plaintext
        hashed_password (str): Zahaszowane hasło z bazy danych

    Returns:
        bool: True jeśli hasła pasują, False w przeciwnym razie

    Example:
        >>> hashed = hash_password("moje_haslo123")
        >>> verify_password("moje_haslo123", hashed)
        True
        >>> verify_password("zle_haslo", hashed)
        False
    """
    if not plain_password or not hashed_password:
        return False

    try:
        # Weryfikacja hasła używając passlib
        return pwd_context.verify(plain_password, hashed_password)

    except Exception as e:
        print(f"❌ Błąd weryfikacji hasła: {e}")
        return False


# ============================================
# FUNKCJE TOKENÓW JWT
# ============================================

def create_token(user_id: int, additional_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Tworzy token JWT dla użytkownika.

    Args:
        user_id (int): ID użytkownika
        additional_data (dict, optional): Dodatkowe dane do umieszczenia w tokenie

    Returns:
        str: Zakodowany token JWT

    Example:
        >>> token = create_token(123)
        >>> print(token)
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    """
    if not user_id:
        raise ValueError("user_id jest wymagane")

    # Czas utworzenia tokenu
    issued_at = datetime.utcnow()

    # Czas wygaśnięcia tokenu
    expiration = issued_at + timedelta(days=TOKEN_EXPIRATION_DAYS)

    # Payload tokenu
    payload = {
        "user_id": user_id,
        "iat": issued_at,  # issued at
        "exp": expiration,  # expiration
        "type": "access"
    }

    # Dodaj opcjonalne dane
    if additional_data:
        payload.update(additional_data)

    # Zakoduj token używając python-jose
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

    print(f"✅ Token utworzony dla user_id: {user_id}, wygasa: {expiration.strftime('%Y-%m-%d %H:%M:%S')}")

    return token


def verify_token(token: str) -> Optional[int]:
    """
    Weryfikuje token JWT i zwraca ID użytkownika.

    Args:
        token (str): Token JWT do weryfikacji

    Returns:
        int | None: ID użytkownika jeśli token jest ważny, None w przeciwnym razie

    Example:
        >>> token = create_token(123)
        >>> user_id = verify_token(token)
        >>> print(user_id)
        123
    """
    if not token:
        print("⚠️ Brak tokenu")
        return None

    try:
        # Dekoduj token używając python-jose
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])

        # Pobierz user_id z payload
        user_id = payload.get("user_id")

        if not user_id:
            print("⚠️ Brak user_id w tokenie")
            return None

        print(f"✅ Token zweryfikowany dla user_id: {user_id}")
        return user_id

    except jwt.ExpiredSignatureError:
        print("⚠️ Token wygasł")
        return None

    except JWTError as e:
        print(f"⚠️ Nieprawidłowy token: {e}")
        return None

    except Exception as e:
        print(f"❌ Błąd weryfikacji tokenu: {e}")
        return None


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Dekoduje token JWT i zwraca cały payload.

    Args:
        token (str): Token JWT do dekodowania

    Returns:
        dict | None: Payload tokenu jeśli token jest ważny, None w przeciwnym razie

    Example:
        >>> token = create_token(123, {"username": "john"})
        >>> payload = decode_token(token)
        >>> print(payload)
        {'user_id': 123, 'username': 'john', 'iat': ..., 'exp': ...}
    """
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload

    except jwt.ExpiredSignatureError:
        print("⚠️ Token wygasł")
        return None

    except JWTError as e:
        print(f"⚠️ Nieprawidłowy token: {e}")
        return None

    except Exception as e:
        print(f"❌ Błąd dekodowania tokenu: {e}")
        return None


def get_token_expiration(token: str) -> Optional[datetime]:
    """
    Pobiera datę wygaśnięcia tokenu.

    Args:
        token (str): Token JWT

    Returns:
        datetime | None: Data wygaśnięcia tokenu lub None jeśli token jest nieprawidłowy
    """
    payload = decode_token(token)

    if not payload or 'exp' not in payload:
        return None

    # Konwersja timestamp do datetime
    expiration_timestamp = payload['exp']
    expiration_date = datetime.fromtimestamp(expiration_timestamp)

    return expiration_date


def is_token_expired(token: str) -> bool:
    """
    Sprawdza czy token wygasł.

    Args:
        token (str): Token JWT

    Returns:
        bool: True jeśli token wygasł lub jest nieprawidłowy, False jeśli jest ważny
    """
    expiration = get_token_expiration(token)

    if not expiration:
        return True

    return datetime.utcnow() > expiration


# ============================================
# FUNKCJE POMOCNICZE DO AUTORYZACJI
# ============================================

def extract_token_from_header(authorization: str) -> Optional[str]:
    """
    Wyciąga token z nagłówka Authorization.

    Args:
        authorization (str): Wartość nagłówka Authorization (np. "Bearer abc123")

    Returns:
        str | None: Token lub None jeśli nagłówek jest nieprawidłowy

    Example:
        >>> token = extract_token_from_header("Bearer abc123")
        >>> print(token)
        'abc123'
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    # Usuń "Bearer " z początku
    token = authorization.replace("Bearer ", "")

    return token if token else None


def get_current_user_id(authorization: str = Header(None)) -> int:
    """
    Pobiera ID aktualnie zalogowanego użytkownika z nagłówka Authorization.

    Używane jako dependency w endpointach FastAPI.

    Args:
        authorization (str): Nagłówek Authorization

    Returns:
        int: ID użytkownika

    Raises:
        HTTPException: Jeśli token jest nieprawidłowy lub brakuje

    Example:
        @app.get("/api/profile")
        async def get_profile(user_id: int = Depends(get_current_user_id)):
            # user_id będzie zawierać ID zalogowanego użytkownika
            pass
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = extract_token_from_header(authorization)

    if not token:
        raise HTTPException(status_code=401, detail="Nieprawidłowy format tokenu")

    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Nieprawidłowy lub wygasły token")

    return user_id


def require_auth(func):
    """
    Dekorator wymagający autoryzacji dla endpointu.

    Example:
        @app.get("/api/protected")
        @require_auth
        async def protected_endpoint(authorization: str = Header(None)):
            return {"message": "Dostęp dozwolony"}
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        authorization = kwargs.get('authorization')

        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

        token = extract_token_from_header(authorization)
        user_id = verify_token(token)

        if not user_id:
            raise HTTPException(status_code=401, detail="Nieprawidłowy token")

        # Dodaj user_id do kwargs
        kwargs['user_id'] = user_id

        return await func(*args, **kwargs)

    return wrapper


# ============================================
# FUNKCJE WALIDACJI
# ============================================

def validate_password(password: str) -> tuple[bool, str]:
    """
    Waliduje hasło według określonych reguł.

    Args:
        password (str): Hasło do walidacji

    Returns:
        tuple[bool, str]: (czy_poprawne, komunikat_błędu)

    Example:
        >>> valid, message = validate_password("abc")
        >>> print(valid, message)
        False 'Hasło musi mieć co najmniej 6 znaków'
    """
    if not password:
        return False, "Hasło nie może być puste"

    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Hasło musi mieć co najmniej {MIN_PASSWORD_LENGTH} znaków"

    if len(password) > 128:
        return False, "Hasło jest zbyt długie (max 128 znaków)"

    return True, "Hasło poprawne"


def validate_email(email: str) -> tuple[bool, str]:
    """
    Waliduje adres email.

    Args:
        email (str): Adres email do walidacji

    Returns:
        tuple[bool, str]: (czy_poprawny, komunikat_błędu)
    """
    import re

    if not email:
        return False, "Email nie może być pusty"

    # Prosty regex dla email
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'

    if not re.match(email_regex, email):
        return False, "Nieprawidłowy format email"

    if len(email) > 254:
        return False, "Email jest zbyt długi"

    return True, "Email poprawny"


# ============================================
# FUNKCJE DEBUGOWANIA
# ============================================

def debug_token(token: str) -> None:
    """
    Wyświetla informacje o tokenie (do debugowania).

    Args:
        token (str): Token JWT do zbadania
    """
    print("\n" + "="*50)
    print("🔍 INFORMACJE O TOKENIE")
    print("="*50)

    if not token:
        print("❌ Brak tokenu")
        return

    # Spróbuj zdekodować bez weryfikacji (do debugowania)
    try:
        # python-jose wymaga options zamiast verify=False
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_signature": False})

        print(f"📋 Payload:")
        for key, value in payload.items():
            if key in ['iat', 'exp']:
                # Formatuj daty
                date = datetime.fromtimestamp(value)
                print(f"   {key}: {date.strftime('%Y-%m-%d %H:%M:%S')} ({value})")
            else:
                print(f"   {key}: {value}")

        # Sprawdź czy token jest wygasły
        expiration = get_token_expiration(token)
        if expiration:
            is_expired = datetime.utcnow() > expiration
            status = "❌ WYGASŁY" if is_expired else "✅ WAŻNY"
            print(f"\n🕐 Status: {status}")

            if not is_expired:
                time_left = expiration - datetime.utcnow()
                print(f"⏰ Czas do wygaśnięcia: {time_left.days} dni, {time_left.seconds // 3600} godzin")

    except Exception as e:
        print(f"❌ Błąd dekodowania tokenu: {e}")

    print("="*50 + "\n")


def test_password_hash() -> None:
    """
    Testuje funkcje haszowania i weryfikacji haseł.
    """
    print("\n" + "="*50)
    print("🧪 TEST HASZOWANIA HASEŁ")
    print("="*50)

    test_password = "test_password_123"

    # Test haszowania
    print(f"\n1. Haszowanie hasła: '{test_password}'")
    hashed = hash_password(test_password)
    print(f"   ✅ Hash: {hashed[:50]}...")

    # Test weryfikacji - poprawne hasło
    print(f"\n2. Weryfikacja poprawnego hasła")
    result = verify_password(test_password, hashed)
    print(f"   {'✅ SUKCES' if result else '❌ BŁĄD'}")

    # Test weryfikacji - niepoprawne hasło
    print(f"\n3. Weryfikacja niepoprawnego hasła")
    result = verify_password("wrong_password", hashed)
    print(f"   {'✅ SUKCES - odrzucono' if not result else '❌ BŁĄD - przyjęto'}")

    print("\n" + "="*50 + "\n")


def test_jwt_token() -> None:
    """
    Testuje funkcje tworzenia i weryfikacji tokenów JWT.
    """
    print("\n" + "="*50)
    print("🧪 TEST TOKENÓW JWT")
    print("="*50)

    test_user_id = 123

    # Test tworzenia tokenu
    print(f"\n1. Tworzenie tokenu dla user_id: {test_user_id}")
    token = create_token(test_user_id, {"username": "test_user"})
    print(f"   ✅ Token: {token[:50]}...")

    # Test weryfikacji tokenu
    print(f"\n2. Weryfikacja tokenu")
    verified_user_id = verify_token(token)
    print(f"   {'✅ SUKCES' if verified_user_id == test_user_id else '❌ BŁĄD'}")
    print(f"   Odczytane user_id: {verified_user_id}")

    # Test dekodowania tokenu
    print(f"\n3. Dekodowanie tokenu")
    payload = decode_token(token)
    print(f"   Payload: {payload}")

    # Debug tokenu
    debug_token(token)

    print("="*50 + "\n")


# ============================================
# GŁÓWNA FUNKCJA (DO TESTOWANIA)
# ============================================

if __name__ == "__main__":
    """
    Uruchom testy modułu autoryzacji.
    
    Użycie:
        python auth.py
    """
    print("\n🚀 URUCHAMIANIE TESTÓW MODUŁU AUTH\n")

    # Testy haszowania haseł
    test_password_hash()

    # Testy tokenów JWT
    test_jwt_token()

    print("✅ Wszystkie testy zakończone\n")