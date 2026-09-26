"""
Redis-Backed OTP (One-Time Password) Service for EcoNext.
Supports passwordless login, email verification, and password resets.
Uses django.core.cache (backed by Redis in production with TTL expiration).
"""

import secrets
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

OTP_DEFAULT_TTL = 300  # 5 minutes in seconds
OTP_MAX_ATTEMPTS = 3


class RedisOTPService:
    @staticmethod
    def _get_key(email: str, purpose: str) -> str:
        return f"otp:{purpose.lower()}:{email.strip().lower()}"

    @staticmethod
    def _get_attempts_key(email: str, purpose: str) -> str:
        return f"otp_attempts:{purpose.lower()}:{email.strip().lower()}"

    @classmethod
    def generate_otp(cls, email: str, purpose: str = 'login', length: int = 6, ttl: int = OTP_DEFAULT_TTL) -> str:
        """
        Generate a cryptographically secure numeric OTP and store it in Redis with TTL.
        """
        # Generate secure random digits
        otp_code = ''.join(secrets.choice('0123456789') for _ in range(length))
        
        cache_key = cls._get_key(email, purpose)
        attempts_key = cls._get_attempts_key(email, purpose)
        
        # Save OTP to Redis with TTL
        cache.set(cache_key, otp_code, timeout=ttl)
        cache.set(attempts_key, 0, timeout=ttl)
        
        logger.info(f"Generated Redis OTP for {email} (purpose: {purpose}, TTL: {ttl}s)")
        return otp_code

    @classmethod
    def verify_otp(cls, email: str, otp_code: str, purpose: str = 'login') -> tuple[bool, str]:
        """
        Verify the provided OTP against the stored Redis key.
        Returns (is_valid, message).
        """
        cache_key = cls._get_key(email, purpose)
        attempts_key = cls._get_attempts_key(email, purpose)
        
        stored_otp = cache.get(cache_key)
        if not stored_otp:
            return False, "OTP has expired or was never requested. Please request a new code."
        
        attempts = cache.get(attempts_key, 0)
        if attempts >= OTP_MAX_ATTEMPTS:
            cache.delete(cache_key)
            cache.delete(attempts_key)
            return False, "Too many failed attempts. This OTP has been invalidated for security."

        if str(stored_otp).strip() == str(otp_code).strip():
            # Invalidate OTP on successful verification to prevent replay attacks
            cache.delete(cache_key)
            cache.delete(attempts_key)
            return True, "OTP verified successfully."
        else:
            cache.set(attempts_key, attempts + 1, timeout=OTP_DEFAULT_TTL)
            remaining = OTP_MAX_ATTEMPTS - (attempts + 1)
            return False, f"Invalid OTP code. {remaining} attempt(s) remaining."
