"""Configuration for PeptideIQ workers."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / ".env.example"
if env_path.exists():
    load_dotenv(env_path)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://peptideiq:peptideiq@localhost:5432/peptideiq")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# AI Models
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Scrapers
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "PeptideIQ/1.0")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# App
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
WORKER_API_URL = os.getenv("WORKER_API_URL", "http://localhost:8000")

# Scraper schedules (in seconds)
SCRAPER_SCHEDULE = {
    "google_trends": {"interval": 4 * 3600, "priority": "high", "timeout": 600},
    "reddit": {"interval": 2 * 3600, "priority": "high", "timeout": 900},
    "youtube": {"interval": 3 * 3600, "priority": "high", "timeout": 600},
    "rss": {"interval": 1 * 3600, "priority": "medium", "timeout": 300},
    "bhw": {"interval": 6 * 3600, "priority": "medium", "timeout": 1200},
    "etsy": {"interval": 8 * 3600, "priority": "low", "timeout": 1800},
    "whop": {"interval": 8 * 3600, "priority": "low", "timeout": 1200},
}

# Seed keywords
SEED_KEYWORDS = {
    "core": [
        "peptides", "peptide therapy", "peptide protocol", "peptide stack",
    ],
    "specific_peptides": [
        "BPC-157", "GHK-Cu", "thymosin alpha 1", "AOD-9604", "tesamorelin",
        "CJC-1295", "ipamorelin", "semaglutide", "tirzepatide", "PT-141",
        "epithalon", "selank", "semax", "DSIP", "kisspeptin", "melanotan",
    ],
    "product_adjacent": [
        "peptide guide", "peptide course", "peptide calculator",
        "peptide dosage", "peptide reconstitution", "peptide storage",
        "peptide cycle", "peptide for beginners",
    ],
    "niche_crossovers": [
        "peptides for skin", "peptides for gut health",
        "peptides for hair loss", "peptides for sleep", "peptides for fat loss",
        "peptides for injury recovery", "peptides for anti-aging",
    ],
}

# Reddit target subreddits
TARGET_SUBREDDITS = [
    "Peptides", "SARMs", "Nootropics", "Biohackers", "Longevity",
    "AntiAging", "SkincareAddiction", "Supplements", "StackAdvice",
    "Testosterone", "moreplatesmoredates", "PeptideScience",
]

# RSS Feed sources
RSS_FEEDS = [
    "https://news.google.com/rss/search?q=peptides+therapy&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=peptide+regulation+FDA&hl=en-US&gl=US&ceid=US:en",
    "https://pubmed.ncbi.nlm.nih.gov/rss/search/1/?term=peptide+therapy&format=abstract",
]
