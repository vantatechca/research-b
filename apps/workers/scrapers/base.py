"""Base scraper class with common functionality."""

import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

import httpx

from config import DATABASE_URL, MOCK_MODE

logger = logging.getLogger(__name__)


class Signal:
    """Represents a raw signal from a scraper."""

    def __init__(
        self,
        signal_type: str,
        source_url: str,
        title: str | None = None,
        raw_content: str | None = None,
        metadata: dict[str, Any] | None = None,
        relevance_score: float = 0.0,
    ):
        self.id = str(uuid.uuid4())
        self.signal_type = signal_type
        self.source_url = source_url
        self.title = title
        self.raw_content = raw_content
        self.metadata = metadata or {}
        self.relevance_score = relevance_score
        self.scraped_at = datetime.now(timezone.utc)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "signal_type": self.signal_type,
            "source_url": self.source_url,
            "title": self.title,
            "raw_content": self.raw_content,
            "metadata": self.metadata,
            "relevance_score": self.relevance_score,
            "scraped_at": self.scraped_at.isoformat(),
        }


class BaseScraper(ABC):
    """Base class for all scrapers."""

    name: str = "base"
    rate_limit_delay: float = 1.0  # seconds between requests

    def __init__(self):
        self.signals: list[Signal] = []
        self.errors: list[str] = []
        self.run_id: str = str(uuid.uuid4())
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def run(self) -> list[Signal]:
        """Execute the scraper."""
        logger.info(f"[{self.name}] Starting scrape run {self.run_id}")
        start_time = datetime.now(timezone.utc)

        try:
            if MOCK_MODE:
                logger.info(f"[{self.name}] Running in MOCK mode")
                self.signals = await self.mock_scrape()
            else:
                self.signals = await self.scrape()

            logger.info(f"[{self.name}] Found {len(self.signals)} signals")
        except Exception as e:
            error_msg = f"[{self.name}] Scrape failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
        finally:
            await self.close()
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"[{self.name}] Completed in {elapsed:.1f}s")

        return self.signals

    @abstractmethod
    async def scrape(self) -> list[Signal]:
        """Implement actual scraping logic. Override in subclass."""
        ...

    @abstractmethod
    async def mock_scrape(self) -> list[Signal]:
        """Return mock data for testing. Override in subclass."""
        ...

    async def rate_limit(self):
        """Respect rate limits between requests."""
        await asyncio.sleep(self.rate_limit_delay)
