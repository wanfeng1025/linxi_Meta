"""Collect a pinned Kanripo Zhouyi transcription seed for human review.

The 69 downloaded text files are a CC BY-SA 4.0 transcription seed only. They
are saved under data/draft and must be checked unit-by-unit against the
project's selected 1815 facsimile before any text can be promoted. This script
never writes production catalog data or application runtime data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path


REPOSITORY = "Kanripo/KR1a0001"
API_ROOT = f"https://api.github.com/repos/{REPOSITORY}"
RAW_ROOT = f"https://raw.githubusercontent.com/{REPOSITORY}"
TEXT_FILE_PATTERN = re.compile(r"^KR1a0001_(\d{3})\.txt$")
EXPECTED_FILE_NAMES = tuple(f"KR1a0001_{index:03d}.txt" for index in range(1, 70))
KANRIPO_TEXT_URL = "https://www.kanripo.org/text/KR1a0001/"
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"


def request_bytes(url: str, contact: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json, application/json",
            "User-Agent": f"LiuyaoAppClassicalCandidateCollector/1.0 ({contact})",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # nosec B310: fixed HTTPS source
        return response.read()


def request_json(url: str, contact: str) -> dict[str, object]:
    payload = json.loads(request_bytes(url, contact).decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected an object from {url}.")
    return payload


def git_blob_sha1(content: bytes) -> str:
    header = f"blob {len(content)}\0".encode("utf-8")
    return hashlib.sha1(header + content).hexdigest()  # nosec B324: Git's required object identifier


def resolve_commit(ref: str, contact: str) -> str:
    payload = request_json(f"{API_ROOT}/commits/{ref}", contact)
    sha = payload.get("sha")
    if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError(f"Could not resolve immutable commit for ref {ref!r}.")
    return sha


def resolve_text_tree(commit: str, contact: str) -> list[dict[str, str]]:
    payload = request_json(f"{API_ROOT}/git/trees/{commit}?recursive=1", contact)
    tree = payload.get("tree")
    if not isinstance(tree, list):
        raise ValueError("GitHub tree response did not contain a tree array.")

    entries: list[dict[str, str]] = []
    for item in tree:
        if not isinstance(item, dict):
            continue
        path = item.get("path")
        sha = item.get("sha")
        item_type = item.get("type")
        if (
            isinstance(path, str)
            and isinstance(sha, str)
            and item_type == "blob"
            and TEXT_FILE_PATTERN.fullmatch(path)
        ):
            entries.append({"path": path, "gitBlobSha1": sha})

    entries.sort(key=lambda item: item["path"])
    found = tuple(entry["path"] for entry in entries)
    if found != EXPECTED_FILE_NAMES:
        raise ValueError(
            "Expected exactly KR1a0001_001.txt through KR1a0001_069.txt; "
            f"received {len(found)} files instead."
        )
    return entries


def write_attribution(destination: Path) -> None:
    destination.write_text(
        "# Kanripo《周易》候选转录种子\n\n"
        "- 上游：Kanseki Repository / Kanripo，`KR1a0001 周易(正文)-周-`\n"
        f"- 原始页面：{KANRIPO_TEXT_URL}\n"
        f"- 上游声明的许可：CC BY-SA 4.0（{LICENSE_URL}）\n"
        "- 本目录用途：机器导入候选，供逐条与《周易正义十卷》清嘉庆二十年（1815）"
        "浙江图书馆藏扫描件比对。\n"
        "- 不是唯一校验底本；不是 production 数据；不得由网站、SQLite 或 API 查询。\n"
        "- 如在未来发布任何受本候选转录影响的内容，须保留适当署名、许可链接和变更说明，并完成"
        "项目规定的逐条定位、权利审核与双人独立复核。\n",
        encoding="utf-8",
    )


def collect(
    *,
    ref: str,
    contact: str,
    output: Path,
    delay_seconds: float,
) -> None:
    if output.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing candidate collection: {output}. "
            "Choose a new --out directory to collect another pinned revision."
        )

    commit = resolve_commit(ref, contact)
    entries = resolve_text_tree(commit, contact)
    staging_parent = output.parent
    staging_parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=staging_parent))

    try:
        files_dir = staging / "files"
        files_dir.mkdir()
        manifest_files: list[dict[str, object]] = []
        for index, entry in enumerate(entries):
            path = entry["path"]
            source_url = f"{RAW_ROOT}/{commit}/{path}"
            content = request_bytes(source_url, contact)
            actual_blob_sha1 = git_blob_sha1(content)
            if actual_blob_sha1 != entry["gitBlobSha1"]:
                raise ValueError(
                    f"Git blob SHA-1 mismatch for {path}: expected {entry['gitBlobSha1']}, "
                    f"received {actual_blob_sha1}."
                )
            (files_dir / path).write_bytes(content)
            manifest_files.append(
                {
                    "path": f"files/{path}",
                    "sourceUrl": source_url,
                    "gitBlobSha1": actual_blob_sha1,
                    "sha256": hashlib.sha256(content).hexdigest(),
                    "byteCount": len(content),
                }
            )
            if index < len(entries) - 1:
                time.sleep(delay_seconds)

        collection_digest = hashlib.sha256(
            json.dumps(
                manifest_files,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        manifest = {
            "schemaVersion": "kanripo-zhouyi-transcription-seed-v1",
            "collectionStatus": "production_candidate",
            "publicationEligible": False,
            "collectedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "source": {
                "repository": f"https://github.com/{REPOSITORY}",
                "repositoryCommit": commit,
                "textPageUrl": KANRIPO_TEXT_URL,
                "sourceRole": "TRANSCRIPTION_SEED",
                "verificationBase": "RUAN_1815_ZJLIB",
                "licenseStatus": "CC-BY-SA-4.0",
                "licenseUrl": LICENSE_URL,
                "attribution": "Kanseki Repository / Kanripo",
                "requiredReview": "Compare every release candidate unit with the selected 1815 facsimile; do not promote automatically.",
            },
            "expectedFileCount": len(EXPECTED_FILE_NAMES),
            "files": manifest_files,
            "collectionSha256": collection_digest,
        }
        (staging / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        write_attribution(staging / "ATTRIBUTION.md")
        staging.replace(output)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="master", help="Git ref to pin before collection (default: master).")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/draft/classical/kanripo-kr1a0001"),
        help="Empty destination directory for this immutable collection.",
    )
    parser.add_argument(
        "--contact",
        default="https://github.com/wanfeng1025/liuyao-app",
        help="Contact URL or address included in the HTTP User-Agent.",
    )
    parser.add_argument(
        "--delay-seconds",
        type=float,
        default=0.2,
        help="Delay between raw-file requests (default: 0.2).",
    )
    args = parser.parse_args()
    if args.delay_seconds < 0:
        raise SystemExit("--delay-seconds cannot be negative.")
    collect(ref=args.ref, contact=args.contact, output=args.out, delay_seconds=args.delay_seconds)


if __name__ == "__main__":
    main()
