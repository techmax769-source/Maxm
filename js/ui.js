// js/ui.js

// Basic toast system + card creation + loader used across the app.
// This file is intentionally small and defensive: it tries many thumbnail fields
// before falling back, and uses <img onerror> to display placeholder when remote image fails.

export const showToast = (message, type = 'info', opts = {}) => {
  const container = document.getElementById('toast-container') || _createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  // styles kept inline to avoid depending on CSS build; replaceable by your stylesheet
  toast.style.cssText = `
    background: ${type === 'error' ? '#d32f2f' : '#222'};
    color: #fff; padding: 10px 14px; margin: 8px;
    border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);
    font-size: 14px; max-width: 320px; word-break: break-word;
    animation: fade-in 220ms ease;
  `;

  toast.innerText = message;
  container.appendChild(toast);

  const ttl = opts.duration || 3000;
  const timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 220);
  }, ttl);

  // allow manual dismiss on click
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    toast.remove();
  });

  return toast;
};

function _createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.style.cssText = 'position:fixed; right:16px; top:16px; z-index:9999; pointer-events:auto;';
  document.body.appendChild(c);
  return c;
}

// Create a movie/series card element used by your grid.
// It tries multiple fields for thumbnail: item.poster, item.thumbnail, item.cover.url, item.stills.url
export const createCard = (rawItem = {}) => {
  const item = _normalizeItemForCard(rawItem);

  const div = document.createElement('div');
  div.className = 'card';
  div.tabIndex = 0;
  div.setAttribute('role', 'link');
  div.setAttribute('aria-label', `${item.title} - ${item.type}`);

  // use a picture element for better fallback in future; for now simple img
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = item.title || 'Poster';
  img.src = item.thumbnail || 'assets/placeholder.jpg';

  // if remote image fails, show placeholder
  img.onerror = () => {
    img.onerror = null;
    img.src = 'assets/placeholder.jpg';
  };

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.innerText = item.title || 'Untitled';

  const meta = document.createElement('div');
  meta.className = 'card-year';
  meta.innerText = `${item.year || 'N/A'} • ${item.type || ''}`;

  info.appendChild(title);
  info.appendChild(meta);

  div.appendChild(img);
  div.appendChild(info);

  div.onclick = () => {
    // if your app uses hash routing like '#info/{id}'
    if (item.id) window.location.hash = `#info/${item.id}`;
  };

  // keyboard support: Enter opens
  div.onkeydown = (e) => {
    if (e.key === 'Enter') div.click();
  };

  return div;
};

// Small helper to pick a thumbnail/poster consistently
function _normalizeItemForCard(item = {}) {
  const posterCandidates = [
    item.poster,
    item.thumbnail,
    item.cover?.thumbnail,
    item.cover?.url,
    item.stills?.url,
    item.image,
    item.poster_url,
    ''
  ];

  const thumbnail = posterCandidates.find(Boolean) || '';

  const id = item.subjectId ?? item.id ?? item.subject_id ?? item._id ?? item.movie_id ?? null;
  const title = item.title ?? item.name ?? 'Untitled';
  const type = (item.subjectType === 2 || String(item.subjectType) === '2') ? 'Series' :
               (item.subjectType === 1 || String(item.subjectType) === '1') ? 'Movie' :
               (item.type || 'Unknown');
  const year = item.releaseDate ? String(item.releaseDate).slice(0,4) : (item.year || '');

  return {
    ...item,
    id,
    title,
    type,
    thumbnail,
    poster: thumbnail,
    year
  };
}

// Minimal loader used by renderer while waiting for API
export const renderLoader = (container) => {
  if (!container) return;
  container.innerHTML = `
    <div class="loader-wrapper" style="display:flex; align-items:center; justify-content:center; height:160px;">
      <div class="skeleton" style="width:100px; height:140px; border-radius:8px; box-shadow:inset 0 0 0 2px rgba(0,0,0,0.03)"></div>
    </div>
  `;
};
