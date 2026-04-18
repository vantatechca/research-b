"""Idea Extraction Pipeline - Processes raw signals into actionable idea cards."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from scrapers.base import Signal

logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    import re
    slug = text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'^-+|-+$', '', slug)
    return slug[:80]


def deduplicate_signals(signals: list[Signal], similarity_threshold: float = 0.85) -> list[list[Signal]]:
    """Group signals that point to the same opportunity using keyword overlap."""
    clusters: list[list[Signal]] = []

    for signal in signals:
        signal_words = set(_extract_keywords(f"{signal.title or ''} {signal.raw_content or ''}"))
        placed = False

        for cluster in clusters:
            # Compare with first signal in cluster
            cluster_words = set(_extract_keywords(f"{cluster[0].title or ''} {cluster[0].raw_content or ''}"))

            if not signal_words or not cluster_words:
                continue

            # Jaccard similarity
            intersection = signal_words & cluster_words
            union = signal_words | cluster_words
            similarity = len(intersection) / len(union) if union else 0

            if similarity >= similarity_threshold:
                cluster.append(signal)
                placed = True
                break

        if not placed:
            clusters.append([signal])

    return clusters


def _extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from text."""
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
        'must', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
        'into', 'through', 'during', 'before', 'after', 'and', 'or', 'but', 'if',
        'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
        'it', 'its', 'he', 'she', 'they', 'them', 'their', 'what', 'which', 'who',
        'how', 'when', 'where', 'why', 'not', 'no', 'so', 'just', 'about', 'also',
    }
    words = text.lower().split()
    return [w for w in words if len(w) > 2 and w not in stop_words]


def extract_ideas_from_clusters(clusters: list[list[Signal]]) -> list[dict[str, Any]]:
    """Convert signal clusters into idea data structures."""
    ideas = []

    for cluster in clusters:
        if not cluster:
            continue

        # Aggregate metadata from all signals in the cluster
        all_titles = [s.title for s in cluster if s.title]
        all_urls = [s.source_url for s in cluster]
        all_platforms = list(set(s.signal_type.split('_')[0] if '_' in s.signal_type else s.signal_type for s in cluster))

        # Use the highest-relevance signal as primary
        primary = max(cluster, key=lambda s: s.relevance_score)

        # Determine product type from signals
        product_types = _infer_product_types(cluster)
        peptide_categories = _infer_peptide_categories(cluster)
        sub_niches = _infer_sub_niches(cluster)

        # Generate title
        title = _generate_idea_title(primary, product_types, peptide_categories)
        slug = slugify(title) + f"-{uuid.uuid4().hex[:6]}"

        # Calculate initial sub-scores
        scores = _calculate_initial_scores(cluster)

        # Determine compliance flag
        compliance = _assess_compliance(title, primary.raw_content or "", product_types)

        idea = {
            "title": title,
            "slug": slug,
            "summary": _generate_summary(cluster, product_types, peptide_categories),
            "status": "pending",
            "compositeScore": _weighted_composite(scores),
            "trendScore": scores["trend"],
            "demandScore": scores["demand"],
            "competitionScore": scores["competition"],
            "feasibilityScore": scores["feasibility"],
            "revenuePotentialScore": scores["revenue"],
            "peptideCategory": peptide_categories,
            "productType": product_types,
            "subNiche": sub_niches,
            "targetAudience": _infer_target_audience(peptide_categories, sub_niches),
            "sourceUrls": all_urls,
            "sourcePlatforms": all_platforms,
            "complianceFlag": compliance["flag"],
            "complianceNotes": compliance["notes"],
            "discoverySource": primary.signal_type,
            "aiModelUsed": "pipeline-v1",
            "signals": [s.to_dict() for s in cluster],
        }

        ideas.append(idea)

    return ideas


def _infer_product_types(signals: list[Signal]) -> list[str]:
    """Infer product types from signal content."""
    text = " ".join(f"{s.title or ''} {s.raw_content or ''}" for s in signals).lower()

    types = []
    if any(kw in text for kw in ["calculator", "tool", "app", "tracker"]):
        types.append("saas")
    if any(kw in text for kw in ["calculator", "compute", "dosage"]):
        types.append("calculator")
    if any(kw in text for kw in ["course", "class", "lesson", "video tutorial"]):
        types.append("course")
    if any(kw in text for kw in ["guide", "ebook", "book", "pdf"]):
        types.append("ebook")
    if any(kw in text for kw in ["template", "printable", "spreadsheet", "planner"]):
        types.append("template")
    if any(kw in text for kw in ["community", "membership", "club", "group"]):
        types.append("membership")
    if any(kw in text for kw in ["ai", "chatbot", "assistant", "generator"]):
        types.append("ai_tool")

    return types or ["ebook"]  # Default to ebook


def _infer_peptide_categories(signals: list[Signal]) -> list[str]:
    """Infer peptide categories from signal content."""
    text = " ".join(f"{s.title or ''} {s.raw_content or ''}" for s in signals).lower()

    peptides = {
        "BPC-157": ["bpc-157", "bpc 157", "bpc157"],
        "GHK-Cu": ["ghk-cu", "ghk cu", "copper peptide"],
        "CJC-1295": ["cjc-1295", "cjc 1295", "cjc1295"],
        "ipamorelin": ["ipamorelin"],
        "semaglutide": ["semaglutide", "ozempic", "wegovy"],
        "tirzepatide": ["tirzepatide", "mounjaro"],
        "PT-141": ["pt-141", "pt 141", "bremelanotide"],
        "epithalon": ["epithalon", "epitalon"],
        "thymosin-alpha-1": ["thymosin alpha", "ta1"],
        "selank": ["selank"],
        "semax": ["semax"],
        "melanotan": ["melanotan"],
        "TB-500": ["tb-500", "tb 500", "thymosin beta"],
        "AOD-9604": ["aod-9604", "aod 9604"],
    }

    found = []
    for category, keywords in peptides.items():
        if any(kw in text for kw in keywords):
            found.append(category)

    return found or ["general"]


def _infer_sub_niches(signals: list[Signal]) -> list[str]:
    """Infer sub-niches from signal content."""
    text = " ".join(f"{s.title or ''} {s.raw_content or ''}" for s in signals).lower()

    niches = {
        "bodybuilding": ["muscle", "bodybuilding", "gym", "strength", "workout"],
        "longevity": ["longevity", "anti-aging", "aging", "lifespan"],
        "skincare": ["skin", "skincare", "wrinkle", "collagen", "complexion"],
        "recovery": ["recovery", "injury", "healing", "rehab", "pain"],
        "weight-loss": ["weight loss", "fat loss", "obesity", "semaglutide", "tirzepatide"],
        "cognitive": ["nootropic", "brain", "cognitive", "focus", "memory"],
        "immune-health": ["immune", "thymosin", "infection", "immunity"],
        "sleep": ["sleep", "insomnia", "rest", "dsip"],
        "biohacking": ["biohack", "optimize", "performance", "stack"],
    }

    found = []
    for niche, keywords in niches.items():
        if any(kw in text for kw in keywords):
            found.append(niche)

    return found or ["general"]


def _generate_idea_title(primary: Signal, product_types: list[str], peptides: list[str]) -> str:
    """Generate a clear idea title."""
    peptide_str = peptides[0] if peptides and peptides[0] != "general" else "Peptide"
    product_str = product_types[0].replace("_", " ").title() if product_types else "Product"

    if primary.title:
        # Clean up the primary signal title
        title = primary.title.strip()
        if len(title) > 60:
            title = title[:57] + "..."
        return title

    return f"{peptide_str} {product_str} Opportunity"


def _generate_summary(signals: list[Signal], product_types: list[str], peptides: list[str]) -> str:
    """Generate a 2-3 sentence summary."""
    signal_count = len(signals)
    platforms = list(set(s.signal_type.split("_")[0] for s in signals))

    return (
        f"Opportunity identified from {signal_count} signals across {', '.join(platforms)}. "
        f"Product type: {', '.join(product_types)}. "
        f"Related peptides: {', '.join(peptides)}."
    )


def _calculate_initial_scores(signals: list[Signal]) -> dict[str, float]:
    """Calculate initial sub-scores from raw signals."""
    scores = {"trend": 50.0, "demand": 50.0, "competition": 50.0, "feasibility": 50.0, "revenue": 50.0}

    for signal in signals:
        meta = signal.metadata

        if signal.signal_type == "google_trend":
            interest = meta.get("interest_value", 0)
            change = meta.get("percent_change_4w", 0)
            scores["trend"] = max(scores["trend"], min(100, interest + change * 0.5))

        elif signal.signal_type in ("reddit_post", "reddit_comment"):
            upvotes = meta.get("upvotes", 0)
            if meta.get("question_detected"):
                scores["demand"] = max(scores["demand"], min(100, 50 + upvotes * 0.3))
            if meta.get("demand_indicator") == "high":
                scores["demand"] = max(scores["demand"], 70)

        elif signal.signal_type == "youtube_video":
            views = meta.get("views", 0)
            scores["demand"] = max(scores["demand"], min(100, 30 + views / 5000))
            if meta.get("has_product_link"):
                scores["revenue"] = max(scores["revenue"], 65)

        elif signal.signal_type in ("etsy_listing", "whop_product"):
            # Existing products = validated demand but also competition
            scores["demand"] = max(scores["demand"], 60)
            scores["competition"] = min(scores["competition"], 70)  # Lower = more saturated
            if meta.get("estimated_sales", 0) > 100:
                scores["revenue"] = max(scores["revenue"], 70)

        elif signal.signal_type == "bhw_thread":
            if meta.get("income_mentioned"):
                scores["revenue"] = max(scores["revenue"], 75)

    return scores


def _weighted_composite(scores: dict[str, float]) -> float:
    """Calculate weighted composite score."""
    weights = {"trend": 0.20, "demand": 0.25, "competition": 0.20, "feasibility": 0.15, "revenue": 0.20}
    return round(sum(scores[k] * weights[k] for k in weights), 1)


def _assess_compliance(title: str, content: str, product_types: list[str]) -> dict[str, str]:
    """Assess compliance risk."""
    text = f"{title} {content}".lower()

    red_flags = ["prescrib", "medical advice", "diagnos", "treat disease", "cure", "minor", "teenager"]
    yellow_flags = ["dosage", "protocol", "dose", "injection", "reconstitut", "therapeutic", "health claim"]

    if any(flag in text for flag in red_flags):
        return {"flag": "red", "notes": "Content may be interpreted as medical advice or has regulatory concerns. Consult a lawyer."}

    if any(flag in text for flag in yellow_flags):
        return {"flag": "yellow", "notes": "Contains health-related recommendations. Frame as educational/research content with disclaimers."}

    return {"flag": "green", "notes": "Educational content, low compliance risk."}


def _infer_target_audience(peptides: list[str], niches: list[str]) -> str:
    """Infer target audience from peptides and niches."""
    if "semaglutide" in peptides or "weight-loss" in niches:
        return "Adults 25-55 seeking weight management solutions"
    if "skincare" in niches:
        return "Women 30-50 interested in anti-aging skincare"
    if "bodybuilding" in niches:
        return "Male fitness enthusiasts 20-40"
    if "longevity" in niches:
        return "Health-conscious adults 35-60 focused on longevity"
    if "cognitive" in niches:
        return "Professionals 25-45 seeking cognitive enhancement"
    return "Intermediate biohackers age 25-45"
