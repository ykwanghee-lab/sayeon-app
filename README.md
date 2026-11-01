# 사연이짱 앱

유튜브 `@사연이짱` 채널의 영상을 웹툰 앱처럼 모아 보는 모바일 우선 웹앱(PWA).

## 배포 주소
https://ykwanghee-lab.github.io/sayeon-app/  (GitHub Pages · gh-pages 브랜치 = app/ 폴더)

재배포: `git subtree push --prefix app origin gh-pages`

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

## 자동 갱신
`.github/workflows/update.yml` 이 매일 05:00(KST) `scripts/update.py` 를 돌려 새 영상을 받고 gh-pages 로 재배포한다.
GitHub 저장소 → Actions → "영상 목록 자동 갱신" → Run workflow 로 즉시 실행 가능.

## 영상 목록 수동 갱신
```
python scripts/update.py     # 증분(빠름)
python scripts/fetch.py      # 전체 새로 받기(느림, 좋아요 수 등 상세 포함)
```
