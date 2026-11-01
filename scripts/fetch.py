# -*- coding: utf-8 -*-
"""채널 영상 목록을 yt-dlp 로 다시 받아 data/ 에 저장한 뒤 app/videos.js 를 갱신한다.
사용법: python scripts/fetch.py        (전체 새로 받기, 몇 분 소요)
"""
import os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
HANDLE = "@사연이짱"
FIELDS = "%(.{id,title,description,duration,view_count,like_count,upload_date,timestamp,thumbnail,channel,channel_id,uploader_id,tags,categories,webpage_url})j"
env = dict(os.environ, PYTHONIOENCODING="utf-8")

for tab, out in (("videos", "videos_full.jsonl"), ("shorts", "shorts_full.jsonl")):
    url = f"https://www.youtube.com/{HANDLE}/{tab}"
    print("fetching", url)
    with open(DATA / out, "w", encoding="utf-8") as f:
        subprocess.run(["yt-dlp", "--skip-download", "--no-warnings", "--ignore-errors",
                        "--print", FIELDS, url], stdout=f, env=env, check=False)

subprocess.run([sys.executable, str(ROOT / "scripts" / "build_data.py")], check=True)
