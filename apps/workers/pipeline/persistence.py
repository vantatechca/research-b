"""Persistence layer for the extraction pipeline.

Saves Ideas into the same Postgres database the Next.js web app reads from.
The schema is owned by Prisma (apps/web/prisma/schema.prisma) — column names
here must match the @map(...) directives there.
"""

import logging
import uuid
from typing import Any

import psycopg2
from psycopg2.extras import Json

logger = logging.getLogger("peptideiq.workers")


def save_ideas_to_db(ideas: list[dict[str, Any]], database_url: str) -> int:
    """Insert ideas into the `ideas` table. Returns count actually inserted.

    Skips rows whose slug already exists (idempotent on re-runs).
    Raises on connection errors so the caller can decide whether to fail
    the scraper run or just log a warning.
    """
    if not ideas:
        return 0

    insert_sql = """
        INSERT INTO ideas (
            id, title, slug, summary, status,
            composite_score, trend_score, demand_score,
            competition_score, feasibility_score, revenue_potential_score,
            peptide_category, product_type, sub_niche, target_audience,
            source_urls, source_platforms, evidence_snapshot,
            compliance_flag, compliance_notes,
            existing_products,
            discovery_source, ai_model_used,
            discovered_at, last_updated
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s,
            %s, %s,
            NOW(), NOW()
        )
        ON CONFLICT (slug) DO NOTHING
    """

    saved = 0
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            for idea in ideas:
                cur.execute(
                    insert_sql,
                    (
                        str(uuid.uuid4()),
                        idea["title"],
                        idea["slug"],
                        idea["summary"],
                        idea.get("status", "pending"),
                        idea.get("compositeScore", 0),
                        idea.get("trendScore", 0),
                        idea.get("demandScore", 0),
                        idea.get("competitionScore", 0),
                        idea.get("feasibilityScore", 0),
                        idea.get("revenuePotentialScore", 0),
                        idea.get("peptideCategory", []),
                        idea.get("productType", []),
                        idea.get("subNiche", []),
                        idea.get("targetAudience"),
                        idea.get("sourceUrls", []),
                        idea.get("sourcePlatforms", []),
                        Json(
                            {
                                "signals": idea.get("signals", [])[:10],  # cap to avoid bloat
                                "cluster_size": len(idea.get("signals", [])),
                            }
                        ),
                        idea.get("complianceFlag", "green"),
                        idea.get("complianceNotes"),
                        Json([]),
                        idea.get("discoverySource"),
                        idea.get("aiModelUsed"),
                    ),
                )
                if cur.rowcount > 0:
                    saved += 1
        conn.commit()
        logger.info(f"  Persisted {saved}/{len(ideas)} ideas to db (rest were duplicates)")
    except Exception as e:
        conn.rollback()
        logger.error(f"  Failed to persist ideas: {e}")
        raise
    finally:
        conn.close()

    return saved