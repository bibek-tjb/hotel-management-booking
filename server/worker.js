import { handleApi } from './hotel.js';
import { ASSETS } from './assets.js';
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/'))return handleApi(request,env);
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
    const path=url.pathname==='/'?'/index.html':url.pathname==='/favicon.ico'?'/assets/favicon.svg':url.pathname;
    const asset=ASSETS[path];
    if(!asset)return new Response('Page not found',{status:404});
    const headers={'content-type':asset.type,'x-content-type-options':'nosniff','referrer-policy':'same-origin','cache-control':path.startsWith('/assets/')?'public, max-age=3600':'no-cache'};
    const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
    return new Response(request.method==='HEAD'?null:bytes,{status:200,headers});
  }
};
