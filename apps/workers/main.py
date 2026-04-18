"""PeptideIQ Worker Orchestrator - Runs scrapers and idea extraction pipeline."""

import asyncio
import logging
import sys
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import MOCK_MODE, SCRAPER_SCHEDULE
from scrapers.reddit_scraper import RedditScraper
from scrapers.google_trends_scraper import GoogleTrendsScraper
from scrapers.youtube_scraper import YouTubeScraper
from scrapers.rss_scraper import RSSScraper
from scrapers.bhw_scraper import BHWScraper
from scrapers.etsy_scraper import EtsyScraper
from scrapers.whop_scraper import WhopScraper
from pipeline.extraction import deduplicate_signals, extract_ideas_from_clusters

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("peptideiq.workers")

# FastAPI app for health checks and manual triggers
app = FastAPI(title="PeptideIQ Workers", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Scraper registry
SCRAPERS = {
    "reddit": RedditScraper,
    "google_trends": GoogleTrendsScraper,
    "youtube": YouTubeScraper,
    "rss": RSSScraper,
    "bhw": BHWScraper,
    "etsy": EtsyScraper,
    "whop": WhopScraper,
}

# Global state
worker_status = {
    "running": False,
    "last_run": None,
    "scraper_statuses": {},
}


@app.get("/health")
async def health():
    return {"status": "ok", "mock_mode": MOCK_MODE, "worker_status": worker_status}


@app.get("/status")
async def status():
    return worker_status


@app.post("/run/{scraper_name}")
async def trigger_scraper(scraper_name: str):
    """Manually trigger a specific scraper."""
    if scraper_name not in SCRAPERS:
        return {"error": f"Unknown scraper: {scraper_name}", "available": list(SCRAPERS.keys())}

    result = await run_single_scraper(scraper_name)
    return result


@app.post("/run-all")
async def trigger_all():
    """Manually trigger all scrapers."""
    results = await run_all_scrapers()
    return {"results": results}


async def run_single_scraper(name: str) -> dict:
    """Run a single scraper and process results."""
    logger.info(f"Running scraper: {name}")
    start_time = datetime.now(timezone.utc)

    scraper_class = SCRAPERS[name]
    scraper = scraper_class()

    signals = await scraper.run()

    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()

    result = {
        "scraper": name,
        "signals_found": len(signals),
        "errors": scraper.errors,
        "elapsed_seconds": round(elapsed, 1),
        "timestamp": start_time.isoformat(),
    }

    worker_status["scraper_statuses"][name] = {
        "last_run": start_time.isoformat(),
        "signals_found": len(signals),
        "status": "completed" if not scraper.errors else "completed_with_errors",
    }

    # Run extraction pipeline if we got signals
    if signals:
        clusters = deduplicate_signals(signals)
        ideas = extract_ideas_from_clusters(clusters)
        result["ideas_generated"] = len(ideas)
        result["clusters"] = len(clusters)

        logger.info(f"  {name}: {len(signals)} signals -> {len(clusters)} clusters -> {len(ideas)} ideas")

        # In production, ideas would be saved to database here
        # For now, just log them
        for idea in ideas:
            logger.info(f"  IDEA: {idea['title']} (score: {idea['compositeScore']})")

    return result


async def run_all_scrapers() -> list[dict]:
    """Run all scrapers sequentially."""
    results = []
    worker_status["running"] = True

    for name in SCRAPERS:
        try:
            result = await run_single_scraper(name)
            results.append(result)
        except Exception as e:
            logger.error(f"Error running {name}: {e}")
            results.append({"scraper": name, "error": str(e)})

    worker_status["running"] = False
    worker_status["last_run"] = datetime.now(timezone.utc).isoformat()

    return results


async def scheduled_loop():
    """Run scrapers on their configured schedules."""
    logger.info("Starting scheduled scraper loop")
    logger.info(f"Mock mode: {MOCK_MODE}")

    # Track last run time for each scraper
    last_runs: dict[str, float] = {name: 0 for name in SCRAPERS}

    while True:
        now = datetime.now(timezone.utc).timestamp()

        for name, config in SCRAPER_SCHEDULE.items():
            if name not in SCRAPERS:
                continue

            interval = config["interval"]
            if now - last_runs[name] >= interval:
                try:
                    await run_single_scraper(name)
                    last_runs[name] = now
                except Exception as e:
                    logger.error(f"Scheduled run failed for {name}: {e}")

        # Check every 60 seconds
        await asyncio.sleep(60)


def main():
    """Entry point for the worker."""
    import argparse

    parser = argparse.ArgumentParser(description="PeptideIQ Worker Orchestrator")
    parser.add_argument("--mock", action="store_true", help="Force mock mode")
    parser.add_argument("--run-once", action="store_true", help="Run all scrapers once and exit")
    parser.add_argument("--scraper", type=str, help="Run a specific scraper")
    parser.add_argument("--api", action="store_true", help="Start the FastAPI server")
    parser.add_argument("--port", type=int, default=8000, help="API server port")
    args = parser.parse_args()

    if args.mock:
        import config
        config.MOCK_MODE = True

    if args.api:
        import uvicorn
        logger.info(f"Starting worker API on port {args.port}")
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    elif args.run_once:
        if args.scraper:
            if args.scraper not in SCRAPERS:
                logger.error(f"Unknown scraper: {args.scraper}. Available: {list(SCRAPERS.keys())}")
                sys.exit(1)
            asyncio.run(run_single_scraper(args.scraper))
        else:
            results = asyncio.run(run_all_scrapers())
            total_signals = sum(r.get("signals_found", 0) for r in results)
            total_ideas = sum(r.get("ideas_generated", 0) for r in results)
            logger.info(f"\nSummary: {total_signals} signals -> {total_ideas} ideas from {len(results)} scrapers")
    else:
        # Default: start API server + scheduled loop
        import uvicorn
        import threading

        # Start scheduled loop in background
        loop_thread = threading.Thread(target=lambda: asyncio.run(scheduled_loop()), daemon=True)
        loop_thread.start()

        # Start API server
        logger.info(f"Starting worker API on port {args.port} with scheduled scraping")
        uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
