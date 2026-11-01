# -*- coding: utf-8 -*-
"""data/*.jsonl (yt-dlp 출력) -> app/videos.js 로 변환.
사용법:  python scripts/build_data.py
갱신:    python scripts/fetch.py  후 다시 실행
"""
import json, re, sys, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "app" / "videos.js"

def load(path):
    items = []
    if not path.exists():
        return items
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            items.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return items

def clean_title(t):
    t = re.sub(r"\s*[|｜]\s*사연이짱\s*$", "", t or "")
    t = re.sub(r"(\s*#(shorts|short|쇼츠))+\s*$", "", t, flags=re.I)
    return t.strip()

def first_para(desc):
    if not desc:
        return ""
    # 채널 공통 소개문(“사연이짱은…”)은 제외, 영상 고유 문장만
    paras = [p.strip() for p in re.split(r"\n\s*\n", desc) if p.strip()]
    for p in paras:
        if p.startswith("사연이짱은") or p.startswith("✔") or "AI 기반" in p:
            continue
        return p[:300]
    return ""

def conv(v, kind):
    return {
        "id": v["id"],
        "kind": kind,
        "title": clean_title(v.get("title")),
        "desc": first_para(v.get("description")),
        "dur": v.get("duration") or 0,
        "views": v.get("view_count") or 0,
        "likes": v.get("like_count") or 0,
        "date": v.get("upload_date") or "",
        "ts": v.get("timestamp") or 0,
        "tags": v.get("tags") or [],
    }

videos = [conv(v, "video") for v in load(DATA / "videos_full.jsonl")]
shorts = [conv(v, "short") for v in load(DATA / "shorts_full.jsonl")]
allv = {v["id"]: v for v in videos + shorts}.values()
allv = sorted(allv, key=lambda v: (v["ts"] or 0, v["date"]), reverse=True)

channel = {
    "name": "사연이짱",
    "handle": "@사연이짱",
    "channel_id": (videos or shorts or [{}])[0].get("channel_id", "") if False else next((v.get("channel_id") for v in load(DATA / "videos_full.jsonl")), ""),
    "updated": __import__("datetime").date.today().isoformat(),
    "count_video": len(videos),
    "count_short": len(shorts),
}

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(
    "// 자동 생성 파일 — scripts/build_data.py 가 만듭니다. 직접 수정하지 마세요.\n"
    "window.CHANNEL = " + json.dumps(channel, ensure_ascii=False) + ";\n"
    "window.VIDEOS = " + json.dumps(list(allv), ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
print(f"videos={len(videos)} shorts={len(shorts)} -> {OUT}")
