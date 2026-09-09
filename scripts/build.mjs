import { readFile,writeFile,mkdir,readdir,cp,rm } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.woff':'font/woff'};
const assets={};
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const name=path.join(folder,entry.name);if(entry.isDirectory())await walk(name);else{const relative='/'+path.relative(path.join(root,'public'),name).split(path.sep).join('/');assets[relative]={type:types[path.extname(name)]||'application/octet-stream',data:(await readFile(name)).toString('base64')};}}}
await walk(path.join(root,'public'));
await rm(path.join(root,'dist'),{recursive:true,force:true});
await mkdir(path.join(root,'dist/server'),{recursive:true});
await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await cp(path.join(root,'public'),path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/server/assets.js'),'export const ASSETS='+JSON.stringify(assets)+';\n');
await cp(path.join(root,'server/hotel.js'),path.join(root,'dist/server/hotel.js'));
await cp(path.join(root,'server/worker.js'),path.join(root,'dist/server/index.js'));
await cp(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json')).catch(()=>{});
await cp(path.join(root,'drizzle'),path.join(root,'dist/.openai/drizzle'),{recursive:true}).catch(()=>{});
console.log(`Built hotel Worker with ${Object.keys(assets).length} embedded assets and database migrations.`);
