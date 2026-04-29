import logging
import threading
import time

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_S2_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
_FIELDS = (
    "paperId,title,authors,year,citationCount,"
    "externalIds,abstract,publicationTypes,venue"
)
_LIMIT = 10
_TIMEOUT = 5
_CACHE_TTL = 3600
_CACHE_PREFIX = "s2_search:"
_MAX_RETRIES = 3
_BACKOFF_BASE = 1.0
_MIN_INTERVAL = 1.0  # seconds between outgoing requests

_rate_lock = threading.Lock()
_last_request_at: float = 0.0


def _throttle() -> None:
    """Block until at least _MIN_INTERVAL seconds have passed since the last request."""
    global _last_request_at
    with _rate_lock:
        now = time.monotonic()
        wait = _MIN_INTERVAL - (now - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()


def _cache_key(query: str) -> str:
    return _CACHE_PREFIX + query.lower().strip()


def _normalize_paper(paper: dict) -> dict:
    external_ids = paper.get("externalIds") or {}
    doi = external_ids.get("DOI", "")
    arxiv_id = external_ids.get("ArXiv", "")
    url = ""
    if doi:
        url = f"https://doi.org/{doi}"
    elif arxiv_id:
        url = f"https://arxiv.org/abs/{arxiv_id}"
    else:
        paper_id = paper.get("paperId", "")
        if paper_id:
            url = f"https://www.semanticscholar.org/paper/{paper_id}"
    pub_types = paper.get("publicationTypes") or []
    publication_type = pub_types[0].lower() if pub_types else "other"
    return {
        "paperId": paper.get("paperId", ""),
        "title": paper.get("title", ""),
        "authors": [a.get("name", "") for a in (paper.get("authors") or [])],
        "year": paper.get("year"),
        "citations": paper.get("citationCount", 0),
        "abstract": paper.get("abstract", ""),
        "venue": paper.get("venue", ""),
        "publicationType": publication_type,
        "doi": doi,
        "url": url,
    }


class RateLimitError(Exception):
    pass


def search_semantic_scholar(query: str) -> list[dict]:
    """Return normalized paper dicts for query.

    Retries up to _MAX_RETRIES times with exponential backoff on HTTP 429.
    Raises RateLimitError if all retries are exhausted. Returns [] on other errors.
    """
    key = _cache_key(query)
    cached = cache.get(key)
    if cached is not None:
        return cached

    api_key = getattr(settings, "SEMANTIC_SCHOLAR_API_KEY", "")
    headers = {"x-api-key": api_key} if api_key else {}

    for attempt in range(_MAX_RETRIES + 1):
        try:
            _throttle()
            response = requests.get(
                _S2_URL,
                params={"query": query, "fields": _FIELDS, "limit": _LIMIT},
                headers=headers,
                timeout=_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json().get("data", [])
            papers = [_normalize_paper(p) for p in data]
            cache.set(key, papers, _CACHE_TTL)
            return papers
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 429:
                if attempt < _MAX_RETRIES:
                    delay = _BACKOFF_BASE * (2**attempt)
                    logger.warning(
                        "Semantic Scholar rate limited, retrying in %.1fs "
                        "(attempt %d/%d)",
                        delay,
                        attempt + 1,
                        _MAX_RETRIES,
                    )
                    time.sleep(delay)
                    continue
                raise RateLimitError() from exc
            logger.exception("Semantic Scholar search failed for query %r", query)
            return []
        except Exception:
            logger.exception("Semantic Scholar search failed for query %r", query)
            return []

    raise RateLimitError()
