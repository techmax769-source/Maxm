const DB_NAME = 'maxmovies-db';
const DB_VER = 1;
const STORE = 'downloads';

function openDB(){
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('by-status','status');
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveDownload(meta){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(meta);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

export async function getAllDownloads(){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const cur = tx.objectStore(STORE).getAll();
    cur.onsuccess = e => res(e.target.result);
    cur.onerror = () => rej(cur.error);
  });
}

export async function getDownload(id){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(id);
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej(r.error);
  });
}
