# 사연이짱 앱

유튜브 `@사연이짱` 채널의 영상을 웹툰 앱처럼 모아 보는 모바일 우선 웹앱(PWA).

## 폴더
- `app/` — 앱 본체 (정적 HTML/CSS/JS). 이 폴더를 그대로 호스팅하면 됨.
- `data/` — yt-dlp 가 받은 원본 메타데이터 (jsonl)
- `scripts/fetch.py` — 채널 영상 목록 새로 받기 + `app/videos.js` 갱신
- `scripts/build_data.py` — `data/*.jsonl` → `app/videos.js` 변환만

## 로컬 실행
```
python -m http.server 8787 --directory app
```
→ http://localhost:8787

## 영상 목록 갱신 (새 영상 올렸을 때)
```
python scripts/fetch.py
```
