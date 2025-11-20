import { saveDownload, getAllDownloads } from './storage.js';
import { toast } from './components/toast.js';

export async function startDownload(meta, url){
  // meta: { id, title, poster }
  const id = meta.id || meta.subjectId || `${Date.now()}`;
  const record = {
    id,
    title: meta.title || meta.name || 'Unknown',
    poster: meta.poster || meta.thumbnail || '',
    url,
    status: 'starting',
    progress: 0,
    created: Date.now()
  };
  await saveDownload(record);
  toast(`Starting download: ${record.title}`, 'info');
  // start actual fetch in background
  downloadWorker(record);
}

async function downloadWorker(rec){
  try{
    const r = await fetch(rec.url);
    if(!r.ok) throw new Error('Network response was not ok');
    const reader = r.body?.getReader();
    if(!reader){
      // fallback: blob
      const blob = await r.blob();
      rec.blob = blob;
      rec.status = 'complete';
      rec.progress = 100;
      await saveDownload(rec);
      toast(`Download complete: ${rec.title}`, 'info');
      return;
    }
    const contentLength = +r.headers.get('Content-Length') || 0;
    let received = 0;
    const chunks = [];
    rec.status = 'downloading';
    await saveDownload(rec);
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      chunks.push(value);
      received += value.length;
      if(contentLength) rec.progress = Math.floor(received / contentLength * 100);
      else rec.progress = Math.min(rec.progress + 5, 99);
      await saveDownload(rec);
    }
    const blob = new Blob(chunks);
    rec.blob = blob;
    rec.progress = 100;
    rec.status = 'complete';
    // important: you may want to store blob in IndexedDB as well; here we store as blob property
    await saveDownload(rec);
    toast(`Download complete: ${rec.title}`, 'info');
  }catch(e){
    rec.status = 'failed';
    await saveDownload(rec);
    toast(`Download failed: ${rec.title}`, 'error');
  }
}

export async function listDownloads(){
  return await getAllDownloads();
}
