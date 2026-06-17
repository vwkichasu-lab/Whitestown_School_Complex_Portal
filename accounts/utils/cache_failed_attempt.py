from django.core.cache import cache


def cache_failed_attempt(ip_address):
    """Cache failed login attempts with expiration"""
    cache_key = f'failed_login_attempts_{ip_address}'
    current_attempts = cache.get(cache_key, 0)
    cache.set(cache_key, current_attempts + 1, 900)  # 15 minutes expiration
