"""Aggregate scraper signals into idea_trends.

Reads idea_signals from the past N days, groups by (idea, week, platform),
and rewrites the corresponding rows in idea_trends.

Idempotent: re-running for the same window deletes prior rows in that
window before reinserting, so it's safe to call after every scrape.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extras import execute_values

from config import DATABASE_URL

logger = logging.getLogger(__name__)


# Map raw signal_type values from scrapers → metric_type values that the
# /api/trends/overview endpoint and the trends page consume. Keep in sync
# with the seed convention (reddit_mentions, google_interest, etc).
def signal_type_to_metric_type(signal_type: str) -> str:
    s = (signal_type or "").lower()
    if "reddit" in s:  return "reddit_mentions"
    if "youtube" in s: return "youtube_videos"
    if "google" in s:  return "google_interest"
    if "etsy" in s:    return "etsy_listings"
    if "whop" in s:    return "whop_listings"
    if "bhw" in s:     return "bhw_mentions"
    if "rss" in s:     return "rss_articles"
    return s or "other"


def aggregate_trends(window_days: int = 30, database_url: str | None = None) -> int:
    """Roll up idea_signals → idea_trends for the past `window_days`.

    Returns the number of trend rows written.
    """
    db_url = database_url or DATABASE_URL
    if not db_url:
        logger.warning("[aggregate_trends] No DATABASE_URL configured; skipping")
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)

    conn = psycopg2.connect(db_url)
    try:
        with conn, conn.cursor() as cur:
            # 1) Weekly buckets per (idea, signal_type)
            cur.execute(
                """
                SELECT
                  idea_id,
                  date_trunc('week', scraped_at) AS week_start,
                  signal_type,
                  COUNT(*) AS signal_count
                FROM idea_signals
                WHERE scraped_at >= %s
                GROUP BY idea_id, week_start, signal_type
                """,
                (cutoff,),
            )
            buckets = cur.fetchall()
            if not buckets:
                logger.info("[aggregate_trends] No signals in window; nothing to do")
                return 0

            # 2) Combine signal_types that map to the same metric_type
            #    (e.g. 'reddit_post' + 'reddit_comment' → 'reddit_mentions')
            merged: dict[tuple[str, str, datetime], float] = {}
            for idea_id, week_start, signal_type, count in buckets:
                metric_type = signal_type_to_metric_type(signal_type)
                key = (str(idea_id), metric_type, week_start)
                merged[key] = merged.get(key, 0.0) + float(count)

            # 3) Idempotent refresh: drop window, reinsert
            cur.execute(
                "DELETE FROM idea_trends WHERE recorded_at >= %s",
                (cutoff,),
            )

            rows = [
                (str(uuid.uuid4()), idea_id, metric_type, value, recorded_at)
                for (idea_id, metric_type, recorded_at), value in merged.items()
            ]

            execute_values(
                cur,
                """
                INSERT INTO idea_trends
                  (id, idea_id, metric_type, metric_value, recorded_at)
                VALUES %s
                """,
                rows,
            )

        platforms = sorted({m for _, m, _ in merged.keys()})
        logger.info(
            f"[aggregate_trends] Wrote {len(merged)} trend rows "
            f"across {len(platforms)} platforms: {platforms}"
        )
        return len(merged)
    finally:
        conn.close()