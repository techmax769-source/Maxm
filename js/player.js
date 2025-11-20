import { toast } from './components/toast.js';

export function initPlayer(container, src, poster=''){
  container.innerHTML = `
    <video id="vm" controls playsinline style="width:100%;height:100%;background:black" poster="${poster}"></video>
  `;
  const video = container.querySelector('video');

  // resume support
  const key = `maxmovies.pos.${src}`;
  try {
    const pos = localStorage.getItem(key);
    if(pos) video.currentTime = Number(pos);
  } catch(e){}

  // HLS support
  if(Hls && Hls.isSupported() && src.endsWith('.m3u8')){
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (e, data) => {
      console.warn('hls error', e, data);
      toast('Playback error (HLS).', 'error');
    });
  } else {
    // attempt native playback (mp4)
    video.src = src;
    video.addEventListener('error', ()=> {
      toast('Playback failed.', 'error');
    });
  }

  // save progress every 5 seconds
  const saver = setInterval(()=> {
    try { localStorage.setItem(key, String(video.currentTime)); } catch(e){}
  }, 5000);

  // cleanup
  video.addEventListener('ended', ()=> clearInterval(saver));
  return { destroy: ()=> clearInterval(saver) };
}
