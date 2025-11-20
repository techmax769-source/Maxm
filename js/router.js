import { api } from './api.js';
import { createCard, renderLoader } from './ui.js';
import { initPlayer } from './player.js';
import { startDownload, listDownloads } from './downloads.js';
import { state, addToHistory } from './state.js';
import { toast } from './components/toast.js';

const app = document.getElementById('app');

export async function router(){
  const hash = location.hash.replace(/^#/, '') || 'home';
  const [route, ...rest] = hash.split('/');
  try{
    if(route==='home') return renderHome();
    if(route==='search') return renderSearch(rest.join('/') || '');
    if(route==='info') return renderInfo(rest[0]);
    if(route==='player') return renderPlayer(rest[0]);
    if(route==='downloads') return renderDownloads();
    if(route==='library') return renderLibrary();
    if(route==='settings') return renderSettings();
    return renderNotFound();
  }catch(e){
    app.innerHTML = `<div class="container"><h3>Error</h3><pre>${e.message}</pre></div>`;
  }
}

async function renderHome(){
  app.innerHTML = `<div class="container"><h2>Trending</h2><div id="grid" class="media-grid"></div></div>`;
  const grid = document.getElementById('grid');
  renderLoader(grid);
  const data = await api.search('action',1,'movie');
  const items = data?.results?.items ?? [];
  grid.innerHTML = '';
  if(items.length===0){
    grid.innerHTML = `<div class="p-1">No content found. <button class="btn" onclick="location.reload()">Retry</button></div>`;
    return;
  }
  items.forEach(it => grid.appendChild(createCard(it)));
}

async function renderSearch(q=''){
  app.innerHTML = `
    <div class="container">
      <h2>Search</h2>
      <input id="q" class="p-1" placeholder="Search..." value="${q}">
      <div id="results" class="media-grid m-1"></div>
    </div>
  `;
  const input = document.getElementById('q');
  const grid = document.getElementById('results');
  let timer;
  input.addEventListener('input', (e)=>{
    clearTimeout(timer);
    timer = setTimeout(async ()=>{
      const query = e.target.value.trim();
      if(!query) { grid.innerHTML = ''; return; }
      renderLoader(grid);
      try{
        const data = await api.search(query,1,'movie');
        const items = data?.results?.items ?? [];
        grid.innerHTML = '';
        if(items.length===0) { grid.innerHTML = '<p class="p-1">No results</p>'; return; }
        items.forEach(it => grid.appendChild(createCard(it)));
      }catch(err){
        grid.innerHTML = `<p class="p-1">Error: ${err.message}</p>`;
      }
    }, 300);
  });
  if(q) input.dispatchEvent(new Event('input'));
}

async function renderInfo(id){
  if(!id) return location.hash='#home';
  app.innerHTML = `<div class="container" id="info-root"></div>`;
  const root = document.getElementById('info-root');
  renderLoader(root);
  const data = await api.getInfo(id);
  const info = data?.results?.subject;
  if(!info) { root.innerHTML = '<p>Not found</p>'; return; }

  // normalize
  const title = info.title ?? info.name ?? 'Untitled';
  const poster = info.poster ?? info.thumbnail ?? info.cover?.url ?? '';

  addToHistory({ id: info.subjectId ?? info.id ?? id, title, poster });

  root.innerHTML = `
    <div class="info-hero">
      <div class="backdrop" style="background-image:url('${poster}')"></div>
    </div>
    <div class="info-content container">
      <h1>${title}</h1>
      <p class="text-muted">${(info.releaseDate||'').slice(0,10)}</p>
      <p>${info.description || info.synopsis || 'No description available.'}</p>
      <div class="flex gap">
        <button class="btn" id="play">Play</button>
        <button class="btn secondary" id="download">Download</button>
      </div>
    </div>
  `;
  document.getElementById('play').onclick = ()=> location.hash = `#player/${info.subjectId ?? info.id ?? id}`;
  document.getElementById('download').onclick = async ()=>{
    toast('Fetching source...', 'info');
    const sources = await api.getSources(info.subjectId ?? info.id ?? id);
    const list = sources?.results ?? [];
    if(!list.length){ toast('No sources', 'error'); return; }
    const best = list[0];
    startDownload({ id: info.subjectId ?? info.id ?? id, title, poster }, best.url || best.download_url || best);
  };
}

let playerInstance;
async function renderPlayer(id){
  app.innerHTML = `<div style="height:100vh;background:black" id="player-root"></div>`;
  const mount = document.getElementById('player-root');
  const sources = await api.getSources(id);
  const list = sources?.results ?? [];
  if(list.length===0){ mount.innerHTML = `<div class="center"><p>No video sources found.</p></div>`; return; }
  const src = list.find(s => s.url?.includes('.m3u8')) || list[0];
  playerInstance = initPlayer(mount, src.url || src.download_url || src.url, '');
}

async function renderDownloads(){
  app.innerHTML = `<div class="container"><h2>Downloads</h2><div id="dl-list"></div></div>`;
  const listEl = document.getElementById('dl-list');
  const items = await listDownloads();
  if(items.length===0) listEl.innerHTML = '<p>No downloads yet.</p>';
  else{
    listEl.innerHTML = items.map(it=>`
      <div class="card" style="display:flex;gap:12px;padding:12px;">
        <img style="width:80px;height:80px;object-fit:cover;border-radius:8px" src="${it.poster}">
        <div>
          <div>${it.title}</div>
          <div class="text-muted">${it.status} • ${it.progress || 0}%</div>
        </div>
      </div>
    `).join('');
  }
}

function renderLibrary(){
  const hist = state.history || [];
  app.innerHTML = `<div class="container"><h2>Recently Watched</h2><div class="media-grid">${hist.map(h=>`
    <div class="card" onclick="location.hash='#info/${h.id}'">
      <img class="thumb" src="${h.poster}">
      <div class="meta"><div class="title">${h.title}</div></div>
    </div>`).join('')}</div></div>`;
}

function renderSettings(){
  app.innerHTML = `<div class="container">
    <h2>Settings</h2>
    <div>
      <label><input type="checkbox" id="mockToggle"> Use Mock Data</label>
    </div>
    <div class="m-1"><button class="btn" id="clear">Clear App Data</button></div>
  </div>`;
  const toggle = document.getElementById('mockToggle');
  toggle.checked = state.useMock;
  toggle.onchange = e => {
    state.useMock = e.target.checked;
    localStorage.setItem('maxmovies.mock', state.useMock ? '1' : '0');
    toast('Mock mode toggled', 'info');
  };
  document.getElementById('clear').onclick = ()=> {
    localStorage.clear(); toast('Cleared local storage', 'info'); location.reload();
  };
}

function renderNotFound(){
  app.innerHTML = `<div class="container"><h2>404 — Not found</h2></div>`;
}

window.addEventListener('hashchange', router);
export default router;
