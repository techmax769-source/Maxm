import router from './router.js';
import { state } from './state.js';

window.addEventListener('load', async ()=>{
  // init
  router();

  // register sw
  if('serviceWorker' in navigator){
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered');
    } catch(e){
      console.warn('SW failed', e);
    }
  }

  // expose simple navigate helper
  window.go = path => location.hash = path;
});
