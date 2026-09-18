"""Low-frequency Wikisource collector for M4 candidate review only.

It intentionally never writes data/source and refuses to run without a real
contact address.  A human must compare the saved revision with a fixed source
before moving any unit out of data/draft.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path


API = "https://zh.wikisource.org/w/api.php"


def fetch(title: str, contact: str) -> dict[str, object]:
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "revisions",
            "rvprop": "ids|timestamp|content",
            "rvslots": "main",
            "format": "json",
            "titles": title,
        }
    )
    request = urllib.request.Request(
        f"{API}?{query}",
        headers={"User-Agent": f"LiuyaoAppCandidateReview/0.1 ({contact})"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # nosec B310: fixed HTTPS API
        payload = json.loads(response.read().decode("utf-8"))
    pages = payload["query"]["pages"]
    page = next(iter(pages.values()))
    revision = page["revisions"][0]
    raw = revision["slots"]["main"]["*"]
    return {
        "title": page["title"],
        "pageId": page["pageid"],
        "revisionId": revision["revid"],
        "timestamp": revision["timestamp"],
        "rawWikitext": raw,
        "sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        "status": "production_candidate",
        "reviewRequired": "Compare against a fixed facsimile; do not promote automatically.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("title", help="Wikisource page title, for example 周易/乾")
    parser.add_argument("--out", type=Path, default=Path("data/draft/classical/raw"))
    args = parser.parse_args()
    contact = os.environ.get("WIKISOURCE_CONTACT_EMAIL", "").strip()
    if not contact or "@" not in contact:
        raise SystemExit("Set WIKISOURCE_CONTACT_EMAIL to a real contact address before collection.")
    result = fetch(args.title, contact)
    args.out.mkdir(parents=True, exist_ok=True)
    filename = f"{result['pageId']}-{result['revisionId']}.json"
    (args.out / filename).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    time.sleep(1.0)  # one request per run; retain a low collection rate.


if __name__ == "__main__":
    main()
