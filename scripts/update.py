# -*- coding: utf-8 -*-
"""증분 갱신: 기존 data/*.jsonl 에 새 영상을 더하고 조회수·제목을 갱신한 뒤 app/videos.js 를 다시 만든다.

GitHub Actions 처럼 유튜브가 봇 차단을 거는 환경에서도 돌아가도록
  1) yt-dlp --flat-playlist (채널 탭 목록: id/제목/길이/조회수) 와
  2) 유튜브 공식 RSS (최근 15편: 업로드일/설명)
만 사용한다. 개별 영상 페이지는 열지 않는다.

사용법: python scripts/update.py
전체를 처음부터 새로 받으려면 scripts/fetch.py 를 쓴다.
"""
import json, os, re, subprocess, sys, time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
HANDLE = "@사연이짱"
CHANNEL_ID = "UCfpwvmxLT5qSx5OAR3LiLWQ"
FILES = {"video": DATA / "videos_full.jsonl", "short": DATA / "shorts_full.jsonl"}
env = dict(os.environ, PYTHONIOENCODING="utf-8")


def load_jsonl(p):
    out = {}
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    v = json.loads(line); out[v["id"]] = v
                except json.JSONDecodeError:
                    pass
    return out


def save_jsonl(p, items):
    p.write_text("".join(json.dumps(v, ensure_ascii=False) + "\n" for v in items), encoding="utf-8")


def flat_list(tab):
    """채널 탭 목록. 실패하면 None."""
    url = f"https://www.youtube.com/{HANDLE}/{tab}"
    try:
        r = subprocess.run(["yt-dlp", "--flat-playlist", "--dump-single-json", "--no-warnings",
                            "--extractor-args", "youtube:lang=ko",
                            "--add-headers", "Accept-Language:ko-KR,ko;q=0.9", url],
                           capture_output=True, text=True, encoding="utf-8", env=env, timeout=300)
        if r.returncode != 0 or not r.stdout.strip():
            print(f"[warn] flat list failed for {tab}: {r.stderr.strip()[-300:]}", file=sys.stderr)
            return None
        return json.loads(r.stdout).get("entries") or []
    except Exception as e:  # noqa
        print(f"[warn] flat list error for {tab}: {e}", file=sys.stderr)
        return None


def rss():
    """공식 RSS: 최근 15편 {id: {title, published(ts), description}}"""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
          "m": "http://search.yahoo.com/mrss/"}
    out = {}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        xml = urllib.request.urlopen(req, timeout=30).read()
        for e in ET.fromstring(xml).findall("a:entry", ns):
            vid = e.findtext("yt:videoId", default="", namespaces=ns)
            pub = e.findtext("a:published", default="", namespaces=ns)
            ts = int(datetime.fromisoformat(pub.replace("Z", "+00:00")).timestamp()) if pub else 0
            grp = e.find("m:group", ns)
            desc = grp.findtext("m:description", default="", namespaces=ns) if grp is not None else ""
            views = 0
            if grp is not None:
                st = grp.find("m:community/m:statistics", ns)
                if st is not None:
                    views = int(st.get("views") or 0)
            out[vid] = {"title": e.findtext("a:title", default="", namespaces=ns), "ts": ts,
                        "description": desc, "views": views}
    except Exception as e:  # noqa
        print(f"[warn] rss failed: {e}", file=sys.stderr)
    return out


def main():
    DATA.mkdir(exist_ok=True)
    existing = {k: load_jsonl(p) for k, p in FILES.items()}
    known = {vid for d in existing.values() for vid in d}
    feed = rss()
    added, updated = 0, 0

    for kind, tab in (("video", "videos"), ("short", "shorts")):
        entries = flat_list(tab)
        if entries is None:
            continue
        cur = existing[kind]
        for e in entries:
            vid = e.get("id")
            if not vid:
                continue
            f = feed.get(vid, {})
            if vid in cur:
                v = cur[vid]
                if e.get("view_count"):
                    v["view_count"] = e["view_count"]
                if f.get("title"):            # RSS 제목은 항상 원문(한국어)
                    v["title"] = f["title"]
                if e.get("duration"):
                    v["duration"] = e["duration"]
                updated += 1
            else:
                ts = f.get("ts") or 0
                cur[vid] = {
                    "id": vid, "title": f.get("title") or e.get("title") or "",
                    "description": f.get("description") or "",
                    "duration": e.get("duration") or 0,
                    "view_count": e.get("view_count") or f.get("views") or 0,
                    "like_count": 0,
                    "upload_date": datetime.fromtimestamp(ts, timezone.utc).strftime("%Y%m%d") if ts else "",
                    "timestamp": ts, "channel": "사연이짱", "channel_id": CHANNEL_ID,
                    "webpage_url": f"https://www.youtube.com/watch?v={vid}", "tags": [],
                }
                known.add(vid); added += 1
                print(f"[new] {kind}: {vid} {cur[vid]['title'][:40]}")

    # 목록 조회가 모두 실패했을 때: RSS 에만 있는 새 영상을 '사연(video)' 으로 추가
    for vid, f in feed.items():
        if vid in known:
            continue
        existing["video"][vid] = {
            "id": vid, "title": f["title"], "description": f["description"], "duration": 0,
            "view_count": f["views"], "like_count": 0,
            "upload_date": datetime.fromtimestamp(f["ts"], timezone.utc).strftime("%Y%m%d") if f["ts"] else "",
            "timestamp": f["ts"], "channel": "사연이짱", "channel_id": CHANNEL_ID,
            "webpage_url": f"https://www.youtube.com/watch?v={vid}", "tags": [],
        }
        known.add(vid); added += 1
        print(f"[new via rss] {vid} {f['title'][:40]}")

    # 기존 영상 중 날짜가 비어 있으면 RSS 로 채움
    for d in existing.values():
        for vid, v in d.items():
            f = feed.get(vid)
            if f and not v.get("timestamp") and f.get("ts"):
                v["timestamp"] = f["ts"]
                v["upload_date"] = datetime.fromtimestamp(f["ts"], timezone.utc).strftime("%Y%m%d")
            if f and not v.get("description") and f.get("description"):
                v["description"] = f["description"]

    for kind, p in FILES.items():
        items = sorted(existing[kind].values(), key=lambda v: v.get("timestamp") or 0, reverse=True)
        save_jsonl(p, items)

    print(f"added={added} updated={updated} total={sum(len(d) for d in existing.values())}")
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build_data.py")], check=True, env=env)


if __name__ == "__main__":
    main()
