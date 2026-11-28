/* 사연이짱 앱 — 정적 데이터(videos.js) + localStorage */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const V = window.VIDEOS || [];
  const CH = window.CHANNEL || {};
  const byId = Object.fromEntries(V.map(v => [v.id, v]));

  // ---------- 저장소 ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('sj:' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sj:' + k, JSON.stringify(v)); } catch {} },
  };
  let saved = store.get('saved', []);          // [id]
  let history = store.get('history', {});       // {id:{t:ms, pos:sec, done:bool}}
  const isSaved = id => saved.includes(id);

  // ---------- 포맷 ----------
  const fmtDur = s => { s = Math.round(s || 0); const m = Math.floor(s / 60), r = s % 60; return (m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:` : `${m}:`) + String(r).padStart(2, '0'); };
  const fmtNum = n => n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n);
  const fmtDate = d => d ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : '';
  const ago = v => {
    if (!v.ts) return fmtDate(v.date);
    const d = (Date.now() / 1000 - v.ts) / 86400;
    if (d < 1) return '오늘'; if (d < 7) return `${Math.floor(d)}일 전`; if (d < 30) return `${Math.floor(d / 7)}주 전`;
    if (d < 365) return `${Math.floor(d / 30)}개월 전`; return `${Math.floor(d / 365)}년 전`;
  };
  const isNew = v => v.ts && (Date.now() / 1000 - v.ts) < 7 * 86400;
  const thumb = (id, q = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- 카드 ----------
  const seenBar = v => {
    const h = history[v.id]; if (!h || !v.dur) return '';
    const p = h.done ? 100 : Math.min(100, Math.round((h.pos || 0) / v.dur * 100));
    return p > 0 ? `<div class="seen"><i style="width:${p}%"></i></div>` : '';
  };
  const card = v => `
    <a class="card ${v.kind}" href="#v/${v.id}">
      <div class="thumb">
        <img loading="lazy" src="${thumb(v.id)}" alt="">
        ${isNew(v) ? '<span class="badge-new">NEW</span>' : ''}
        <span class="dur">${fmtDur(v.dur)}</span>${seenBar(v)}
      </div>
      <div class="t">${esc(v.title)}</div>
      <div class="m">조회 ${fmtNum(v.views)} · ${ago(v)}</div>
    </a>`;
  const row = (v, now) => `
    <a class="row ${v.kind} ${now ? 'now' : ''}" href="#v/${v.id}">
      <div class="thumb"><img loading="lazy" src="${thumb(v.id)}" alt=""><span class="dur">${fmtDur(v.dur)}</span>${seenBar(v)}</div>
      <div class="body"><div class="t">${esc(v.title)}</div><div class="m">${now ? '지금 보는 중' : `조회 ${fmtNum(v.views)} · ${ago(v)}`}</div></div>
    </a>`;
  const empty = (b, s) => `<div class="empty"><b>${b}</b>${s}</div>`;

  // ---------- 뷰 ----------
  const main = $('#main');
  const videos = V.filter(v => v.kind === 'video');
  const shorts = V.filter(v => v.kind === 'short');
  let currentView = 'home';
  let sort = 'new';
  let query = '';

  function hero(v, kicker, pct) {
    return `<a class="hero" href="#v/${v.id}"><img src="${thumb(v.id, 'hq720')}" onerror="this.onerror=null;this.src='${thumb(v.id)}'" alt=""><div class="shade"></div>
      <div class="cap"><div class="kicker">${kicker}</div><div class="t">${esc(v.title)}</div></div>
      ${pct != null ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}</a>`;
  }

  function viewHome() {
    const hist = Object.entries(history).sort((a, b) => b[1].t - a[1].t).map(([id]) => byId[id]).filter(Boolean);
    const cont = hist.find(v => !history[v.id].done && (history[v.id].pos || 0) > 10);
    const popular = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);
    const newest = videos.slice(0, 10);
    let h = '';
    if (cont) {
      const p = Math.min(100, Math.round((history[cont.id].pos || 0) / (cont.dur || 1) * 100));
      h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">이어보기</h2></div>${hero(cont, `${fmtDur(history[cont.id].pos || 0)} 부터 계속`, p)}</section>`;
    } else if (videos[0]) {
      const v = videos[0];
      h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">최신 사연</h2></div>${hero(v, `${ago(v)} · ${fmtDur(v.dur)}`)}</section>`;
    }
    h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">새로 올라온 사연</h2><a class="more" href="#videos">전체 ${videos.length}편</a></div><div class="rail">${newest.map(card).join('')}</div></section>`;
    h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">많이 본 사연</h2></div><div class="rail">${popular.map(card).join('')}</div></section>`;
    if (shorts.length) h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">짧은 사연 · 쇼츠</h2><a class="more" href="#shorts">전체 ${shorts.length}편</a></div><div class="rail">${shorts.slice(0, 12).map(card).join('')}</div></section>`;
    if (saved.length) h += `<section class="sec"><div class="sec-head"><h2 class="sec-title">찜한 사연</h2><a class="more" href="#saved">전체</a></div><div class="rail">${saved.map(id => byId[id]).filter(Boolean).slice(0, 10).map(card).join('')}</div></section>`;
    main.innerHTML = h;
  }

  function sortChips() {
    const opts = [['new', '최신순'], ['pop', '인기순'], ['old', '오래된순'], ['long', '긴 사연'], ['unseen', '안 본 사연']];
    return `<div class="chips">${opts.map(([k, l]) => `<button class="chip ${sort === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>`;
  }
  function applySort(list) {
    list = [...list];
    if (sort === 'pop') list.sort((a, b) => b.views - a.views);
    else if (sort === 'old') list.reverse();
    else if (sort === 'long') list.sort((a, b) => b.dur - a.dur);
    else if (sort === 'unseen') list = list.filter(v => !history[v.id]);
    return list;
  }
  function viewList(kind) {
    const src = kind === 'short' ? shorts : videos;
    const list = applySort(src);
    main.innerHTML = `<section class="sec"><h2 class="sec-title">${kind === 'short' ? '쇼츠' : '모든 사연'}</h2>${sortChips()}<div class="count">${list.length}편</div>
      ${list.length ? `<div class="grid ${kind === 'short' ? 'shorts' : ''}">${list.map(card).join('')}</div>` : empty('모두 봤어요', '안 본 사연이 없습니다.')}</section>`;
  }
  function viewSaved() {
    const list = saved.map(id => byId[id]).filter(Boolean);
    main.innerHTML = `<section class="sec"><h2 class="sec-title">찜한 사연</h2>
      ${list.length ? `<div class="list">${list.map(v => row(v)).join('')}</div>` : empty('찜한 사연이 없어요', '플레이어에서 찜하기를 누르면 여기에 모아둡니다.')}</section>`;
  }
  function viewHistory() {
    const list = Object.entries(history).sort((a, b) => b[1].t - a[1].t).map(([id]) => byId[id]).filter(Boolean);
    main.innerHTML = `<section class="sec"><div class="sec-head"><h2 class="sec-title">시청 기록</h2>${list.length ? '<button class="more" id="clearHist">모두 지우기</button>' : ''}</div>
      ${list.length ? `<div class="list">${list.map(v => row(v)).join('')}</div>` : empty('아직 본 사연이 없어요', '본 사연은 자동으로 여기에 남고, 보던 위치부터 이어볼 수 있어요.')}</section>`;
    const btn = $('#clearHist');
    if (btn) btn.addEventListener('click', () => { if (confirm('시청 기록을 모두 지울까요?')) { history = {}; store.set('history', history); viewHistory(); } });
  }
  function viewSearch() {
    const q = query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const list = terms.length ? V.filter(v => { const s = (v.title + ' ' + v.desc + ' ' + (v.tags || []).join(' ')).toLowerCase(); return terms.every(t => s.includes(t)); }) : [];
    main.innerHTML = `<section class="sec">${terms.length ? `<div class="count">"${esc(query)}" 검색 결과 ${list.length}편</div>` : ''}
      ${list.length ? `<div class="list">${list.map(v => row(v)).join('')}</div>` : terms.length ? empty('검색 결과가 없어요', '다른 단어로 찾아보세요. 예) 시어머니, 상견례, 유산') : empty('무엇을 찾을까요?', '제목과 설명에서 찾습니다. 띄어쓰기로 여러 단어도 가능해요.')}</section>`;
  }

  function render() {
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
    if (!$('#searchBar').hidden) return viewSearch();
    ({ home: viewHome, videos: () => viewList('video'), shorts: () => viewList('short'), saved: viewSaved, history: viewHistory }[currentView] || viewHome)();
    window.scrollTo(0, 0);
  }

  // ---------- 플레이어 ----------
  const player = $('#player'), frameWrap = $('#frameWrap');
  let cur = null, yt = null, tick = null, ytReady = false;
  window.onYouTubeIframeAPIReady = () => { ytReady = true; if (cur) mount(cur); };
  (function loadYT() { const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); })();

  function destroyPlayer() {
    if (yt && yt.destroy) { stopTick(true); try { yt.destroy(); } catch {} }
    yt = null; frameWrap.innerHTML = '';
  }
  function mount(v) {
    frameWrap.innerHTML = '<div id="ytFrame"></div>';
    const start = Math.floor((history[v.id] && history[v.id].pos) || 0);
    const done = history[v.id] && history[v.id].done;
    const startAt = (done || start < 10 || (v.dur && start > v.dur - 15)) ? 0 : start;
    yt = new YT.Player('ytFrame', {
      videoId: v.id,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: startAt, hl: 'ko' },
      events: {
        onStateChange: e => {
          if (e.data === YT.PlayerState.PLAYING) startTick();
          else stopTick(true);
          if (e.data === YT.PlayerState.ENDED) { mark(v, yt.getDuration(), true); const n = nextOf(v); if (n) location.hash = '#v/' + n.id; }
        }
      }
    });
  }
  function startTick() { stopTick(); tick = setInterval(() => { if (yt && yt.getCurrentTime && cur) mark(cur, yt.getCurrentTime(), false); }, 5000); }
  function stopTick(save) { if (tick) clearInterval(tick); tick = null; if (save && yt && yt.getCurrentTime && cur) { try { mark(cur, yt.getCurrentTime(), false); } catch {} } }
  function mark(v, pos, done) {
    if (!v) return;
    const h = history[v.id] || {};
    history[v.id] = { t: Date.now(), pos: Math.floor(pos || 0), done: !!(done || h.done || (v.dur && pos > v.dur * 0.95)) };
    store.set('history', history);
  }
  const nextOf = v => { const list = v.kind === 'short' ? shorts : videos; const i = list.findIndex(x => x.id === v.id); return list[i + 1] || list[0]; };

  function openVideo(id) {
    const v = byId[id]; if (!v) { location.hash = ''; return; }
    destroyPlayer();
    cur = v;
    frameWrap.className = 'frame-wrap ' + (v.kind === 'short' ? 'short' : '');
    $('#playerKicker').textContent = v.kind === 'short' ? '쇼츠' : `사연 · ${fmtDur(v.dur)}`;
    $('#playerTitle').textContent = v.title;
    $('#playerMeta').textContent = `조회 ${fmtNum(v.views)}${v.likes ? ` · 좋아요 ${fmtNum(v.likes)}` : ''} · ${fmtDate(v.date) || ago(v)}`;
    $('#playerDesc').textContent = v.desc || '';
    $('#ytLink').href = `https://www.youtube.com/watch?v=${v.id}`;
    renderSaveBtn();
    const list = v.kind === 'short' ? shorts : videos; const i = list.findIndex(x => x.id === v.id);
    const next = [...list.slice(i + 1), ...list.slice(0, i)].slice(0, 6);
    $('#nextList').innerHTML = next.map(x => row(x)).join('');
    player.hidden = false; document.body.style.overflow = 'hidden'; player.scrollTop = 0;
    mark(v, (history[v.id] && history[v.id].pos) || 0, false);
    if (ytReady) mount(v); else frameWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  function closeVideo() {
    destroyPlayer(); cur = null;
    player.hidden = true; document.body.style.overflow = '';
  }
  function renderSaveBtn() {
    const on = isSaved(cur.id);
    $('#saveBtn').className = 'chip ' + (on ? 'on' : '');
    $('#saveBtn').innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"${on ? ' fill="currentColor"' : ''}/></svg>${on ? '찜했어요' : '찜하기'}`;
  }
  $('#saveBtn').addEventListener('click', () => {
    saved = isSaved(cur.id) ? saved.filter(x => x !== cur.id) : [cur.id, ...saved];
    store.set('saved', saved); renderSaveBtn(); toast(isSaved(cur.id) ? '찜 목록에 담았어요' : '찜을 해제했어요');
  });
  $('#playerBack').addEventListener('click', () => { location.hash = '#' + currentView; });
  $('#playerShare').addEventListener('click', async () => {
    const url = `https://youtu.be/${cur.id}`;
    if (navigator.share) { try { await navigator.share({ title: cur.title, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요'); } catch {} }
  });

  // ---------- 토스트 ----------
  let toastEl;
  function toast(msg) { if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); } toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1600); }

  // ---------- 라우팅 ----------
  function route() {
    const h = location.hash.slice(1);
    if (h.startsWith('v/')) { openVideo(h.slice(2)); return; }
    if (!player.hidden) closeVideo();
    if (['home', 'videos', 'shorts', 'saved', 'history'].includes(h)) currentView = h;
    render();
  }
  window.addEventListener('hashchange', route);
  document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => { closeSearch(); if (currentView === b.dataset.view) render(); else location.hash = '#' + b.dataset.view; }));
  main.addEventListener('click', e => { const c = e.target.closest('[data-sort]'); if (c) { sort = c.dataset.sort; render(); } });
  $('#brand').addEventListener('click', () => { closeSearch(); location.hash = '#home'; render(); });

  // ---------- 검색 ----------
  const searchBar = $('#searchBar'), searchInput = $('#searchInput');
  $('#searchBtn').addEventListener('click', () => { searchBar.hidden = false; searchInput.focus(); viewSearch(); });
  $('#searchClose').addEventListener('click', closeSearch);
  function closeSearch() { if (searchBar.hidden) return; searchBar.hidden = true; query = ''; searchInput.value = ''; render(); }
  searchInput.addEventListener('input', () => { query = searchInput.value; viewSearch(); });

  // ---------- 시작 ----------
  $('#brandSub').textContent = `사연 ${videos.length}편 · 쇼츠 ${shorts.length}편${CH.updated ? ` · ${CH.updated} 기준` : ''}`;
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
