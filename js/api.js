// js/api.js
import { state } from './state.js';
import { showToast } from './ui.js';

const BASE_URL = 'https://movieapi.giftedtech.co.ke/api';
const DEFAULT_TIMEOUT = 6000;

// Simple in-memory cache to reduce flicker on repeated requests during a session
const cache = new Map();

export const api = {
  // Generic fetch wrapper with timeout, CORS detection, mock fallback and cache
  async fetch(endpoint, { useCache = true, forceRefresh = false } = {}) {
    // Respect mock mode
    if (state.mockMode) return this.mockFetch(endpoint);

    const cacheKey = `${endpoint}`;
    if (useCache && !forceRefresh && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        signal: controller.signal,
        // ensure we don't send weird credentials unless your app requires them
        credentials: 'omit',
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      // CORS problem detection: opaque response or status 0 (some browsers)
      // If mode is "no-cors" or a CORS blocked response arrives, the response will be opaque.
      if (res.type === 'opaque' || res.status === 0) {
        throw new Error('CORS or network blocked the response (opaque).');
      }

      if (!res.ok) {
        // 4xx/5xx
        throw new Error(`API Error ${res.status}`);
      }

      const data = await res.json();

      // Normalize into predictable shape
      const normalized = this.normalizeResponse(endpoint, data);

      // Cache normalized response
      if (useCache) cache.set(cacheKey, normalized);

      return normalized;

    } catch (err) {
      console.warn('API.fetch error:', err);

      // If aborted (timeout), try fallback mock and show toast
      if (err.name === 'AbortError') {
        showToast('Request timed out — switching to Offline Mode (mock).', 'error');
        return this.mockFetch(endpoint);
      }

      // Recognize CORS-like errors
      if (err.message && err.message.toLowerCase().includes('cors')) {
        showToast('CORS error: server blocked the request.', 'error');
      } else {
        // Generic network error fallback
        showToast('Network error — using mock data.', 'error');
      }

      // Final fallback to mock fetch to keep UI functional
      return this.mockFetch(endpoint);
    }
  },

  /*********************
   * NORMALIZER (LIVE)
   *
   * This ensures the rest of your code receives:
   * - search => { results: [ items... ] }
   * - info   => { results: { subject: {...} } }
   * - sources=> { results: [ sources... ] }
   *********************/
  normalizeResponse(endpoint, data) {
    try {
      // Common top-level shapes observed in your API:
      // - { results: { items: [...] , pager: {...} } }
      // - { results: [ ... ] }
      // - { data: [...] }
      // - { results: { subject: {...} } }
      // We'll normalize to consistent shapes the app expects.

      // SEARCH endpoints
      if (endpoint.includes('/search')) {
        // possible containers
        const items =
          data?.results?.items ??
          data?.results ??
          data?.data ??
          data?.items ??
          [];

        // ensure array
        const arr = Array.isArray(items) ? items : [];

        // normalize each item (small helper)
        const normalizedItems = arr.map(this._normalizeItemForUI);

        // keep pager when present so caller may read it if they want
        const pager = data?.results?.pager ?? data?.pager ?? null;

        return { results: normalizedItems, pager };
      }

      // INFO endpoint
      if (endpoint.includes('/info')) {
        // server sometimes returns results.subject or results or subject directly
        const subject =
          data?.results?.subject ??
          data?.subject ??
          data?.results ??
          data ??
          {};

        const normalizedSubject = this._normalizeSubjectForUI(subject);

        return { results: { subject: normalizedSubject } };
      }

      // SOURCES endpoint
      if (endpoint.includes('/sources')) {
        // sometimes results is array, sometimes results.sources, sometimes data
        const list =
          data?.results ??
          data?.sources ??
          data?.data ??
          data ??
          [];

        const arr = Array.isArray(list) ? list : [];

        // ensure each source has .url and a safe download_url
        const normalizedSources = arr.map(s => ({
          ...s,
          url: s.url || s.file || s.stream || '',
          download_url: s.download_url || s.url || s.file || s.stream || ''
        }));

        return { results: normalizedSources };
      }

    } catch (e) {
      console.error('normalizeResponse error', e);
    }

    // default safe shape for unknown endpoints
    return { results: [] };
  },

  // Helper: normalize a search item into the fields your UI expects (id, title, poster, thumbnail, type, year)
  _normalizeItemForUI(item = {}) {
    // The API uses subjectId or id; title; cover.url/stills.url/thumbnail
    const id = item.subjectId ?? item.id ?? item.subject_id ?? item.subject ?? null;
    const title = item.title ?? item.name ?? '';
    const type = (item.subjectType === 2 || String(item.subjectType) === '2') ? 'series' :
                 (item.subjectType === 1 || String(item.subjectType) === '1') ? 'movie' :
                 (item.type || 'unknown');

    // Poster / thumbnail heuristics (covers many shapes)
    const poster =
      item.poster ??
      item.thumbnail ??
      item.cover?.thumbnail ||
      item.cover?.url ||
      item.stills?.url ||
      item.image ||
      '';

    // year fallback from releaseDate or year field
    const year = (item.releaseDate && String(item.releaseDate).slice(0,4)) || item.year || '';

    return {
      ...item,
      id,
      title,
      type,
      poster,
      thumbnail: poster,
      year
    };
  },

  // Helper: Normalize info subject
  _normalizeSubjectForUI(subject = {}) {
    // Map fields into common names used by your router/ui
    const id = subject.subjectId ?? subject.id ?? subject.subject_id ?? null;
    const title = subject.title ?? subject.name ?? '';
    const poster =
      subject.poster ??
      subject.cover?.url ??
      subject.thumbnail ??
      subject.cover?.thumbnail ??
      subject.stills?.url ??
      '';
    const description = subject.description ?? subject.synopsis ?? '';
    const year = (subject.releaseDate && String(subject.releaseDate).slice(0,4)) || subject.year || '';
    const rating = subject.imdbRatingValue ?? subject.rating ?? subject.imdbRating ?? '';

    // Also keep original data under _raw for debugging
    return {
      ...subject,
      id,
      title,
      poster,
      description,
      year,
      rating,
      _raw: subject
    };
  },

  /*********************
   * PUBLIC API
   *********************/
  async search(query, page = 1, type = "movie", options = {}) {
    const cleanedQuery = encodeURIComponent(query || '');
    const endpoint = `/search/${cleanedQuery}?page=${page}&type=${encodeURIComponent(type)}`;
    return this.fetch(endpoint, options);
  },

  async getInfo(id, options = {}) {
    if (!id) return { results: { subject: null } };
    const endpoint = `/info/${encodeURIComponent(id)}`;
    return this.fetch(endpoint, options);
  },

  async getSources(id, season = null, episode = null, options = {}) {
    if (!id) return { results: [] };
    let url = `/sources/${encodeURIComponent(id)}`;
    if (season && episode) {
      url += `?season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
    }
    return this.fetch(url, options);
  },

  /*********************
   * MOCK FAILSAFE
   *********************/
  async mockFetch(endpoint) {
    // simulate small delay so UI shows loaders naturally
    await new Promise(r => setTimeout(r, 220));

    try {
      // route to file names (assumes ./mock/*.json next to your index)
      if (endpoint.includes('/search')) {
        const res = await fetch('./mock/search.json');
        const j = await res.json();

        const arr = j?.results?.items ??
                    j?.results ??
                    j?.data ??
                    j?.items ??
                    (Array.isArray(j) ? j : []);

        const normalized = Array.isArray(arr) ? arr.map(this._normalizeItemForUI) : [];
        const pager = j?.results?.pager ?? j?.pager ?? null;
        return { results: normalized, pager };
      }

      if (endpoint.includes('/info')) {
        const res = await fetch('./mock/info.json');
        const j = await res.json();

        const subject =
          j?.results?.subject ??
          j?.subject ??
          j ??
          {};

        const normalizedSubject = this._normalizeSubjectForUI(subject);
        return { results: { subject: normalizedSubject } };
      }

      if (endpoint.includes('/sources')) {
        const res = await fetch('./mock/sources.json');
        const j = await res.json();

        const list =
          j?.results ??
          j?.sources ??
          j?.data ??
          (Array.isArray(j) ? j : []);

        // ensure each has url and download_url
        const clean = Array.isArray(list) ? list.map(s => ({
          ...s,
          url: s.url || s.file || s.stream || '',
          download_url: s.download_url || s.url || s.file || s.stream || ''
        })) : [];

        return { results: clean };
      }

    } catch (e) {
      console.error('Mock fetch failed', e);
      return { results: [] };
    }

    return { results: [] };
  }
};
