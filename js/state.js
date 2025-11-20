export const state = {
  useMock: false,         // toggled in settings UI
  history: [],
  watchlist: [],
  prefs: {
    defaultQuality: 'auto',
    subtitleLang: 'en',
    dataSaver: false
  }
};

export function addToHistory(item){
  if(!item || !item.id) return;
  state.history = state.history.filter(h => h.id !== item.id);
  state.history.unshift(item);
  if(state.history.length>50) state.history.pop();
  try { localStorage.setItem('maxmovies.history', JSON.stringify(state.history)); } catch(e){}
}

export function loadState(){
  try{
    const h = localStorage.getItem('maxmovies.history');
    if(h) state.history = JSON.parse(h);
    const prefs = localStorage.getItem('maxmovies.prefs');
    if(prefs) state.prefs = {...state.prefs, ...JSON.parse(prefs)};
    const mock = localStorage.getItem('maxmovies.mock');
    if(mock) state.useMock = mock === '1';
  }catch(e){}
}
loadState();
