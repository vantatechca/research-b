"""Persistence layer for the extraction pipeline.

Saves Ideas (and their underlying signals) into the same Postgres
database the Next.js web app reads from.

The schema is owned by Prisma (apps/web/prisma/schema.prisma) — column
names here must match the @map(...) directives there.
"""

import logging
import uuid
from typing import Any

import psycopg2
from psycopg2.extras import Json, execute_values

logger = logging.getLogger("peptideiq.workers")


def save_ideas_to_db(ideas: list[dict[str, Any]], database_url: str) -> int:
    """Insert ideas + their source signals. Returns count of ideas actually inserted.

    For each idea:
      1. INSERT into `ideas` (skip on duplicate slug, return id either way)
      2. Resolve the idea's id (newly inserted OR existing from dupe slug)
      3. Queue each source signal for batch insert into `idea_signals`

    Signal saves are non-deduped — same source_url scraped twice creates
    two rows. That's intentional: the trends aggregator counts weekly
    signal volume, so repeated mentions ARE the trend.
    """
    if not ideas:
        return 0

    idea_insert_sql = """
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
        RETURNING id
    """

    saved = 0
    signal_rows: list[tuple] = []  # batched and inserted at the end

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            for idea in ideas:
                new_id = str(uuid.uuid4())
                cur.execute(
                    idea_insert_sql,
                    (
                        new_id,
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
                                "signals": idea.get("signals", [])[:10],
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

                # Resolve idea_id — newly inserted OR existing for dupe slug
                returned = cur.fetchone()
                if returned:
                    idea_id = returned[0]
                    saved += 1
                else:
                    cur.execute(
                        "SELECT id FROM ideas WHERE slug = %s",
                        (idea["slug"],),
                    )
                    row = cur.fetchone()
                    idea_id = row[0] if row else None

                if not idea_id:
                    continue

                # Queue source signals tied to this idea
                for sig in idea.get("signals", []):
                    signal_rows.append(
                        (
                            str(uuid.uuid4()),
                            str(idea_id),
                            sig.get("signal_type", "unknown"),
                            sig.get("source_url", ""),
                            sig.get("title"),
                            sig.get("raw_content"),
                            Json(sig.get("metadata", {})),
                            float(sig.get("relevance_score", 0.0)),
                            sig.get("scraped_at"),  # ISO string from Signal.to_dict()
                        )
                    )

            # Batch insert all queued signals in one round trip
            if signal_rows:
                execute_values(
                    cur,
                    """
                    INSERT INTO idea_signals (
                        id, idea_id, signal_type, source_url,
                        title, raw_content, metadata, relevance_score, scraped_at
                    )
                    VALUES %s
                    ON CONFLICT (source_url) DO UPDATE SET
                        scraped_at      = EXCLUDED.scraped_at,
                        metadata        = EXCLUDED.metadata,
                        relevance_score = EXCLUDED.relevance_score,
                        title           = EXCLUDED.title
                    """,
                    signal_rows,
                )

        conn.commit()
        logger.info(
            f"  Persisted {saved}/{len(ideas)} ideas + {len(signal_rows)} signals "
            f"(remaining ideas were duplicate slugs)"
        )
    except Exception as e:
        conn.rollback()
        logger.error(f"  Failed to persist ideas: {e}")
        raise
    finally:
        conn.close()

    return saved