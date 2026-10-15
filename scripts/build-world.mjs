import {build} from 'vite';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
const configFile=new URL('../vite.world.config.ts',import.meta.url).pathname;
await build({configFile});
await build({configFile,publicDir:false,build:{ssr:'world-src/render.tsx',outDir:'.render',emptyOutDir:true,manifest:false,rollupOptions:{input:'world-src/render.tsx'}}});
const {render,routes,title,base}=await import('../.render/render.js');
const manifest=JSON.parse(await readFile('world/.vite/manifest.json','utf8'));
const entry=manifest['world-src/main.tsx'];
for(const route of routes){const dir='world/'+route;await mkdir(dir,{recursive:true});const heading=title(route);await writeFile(dir+'index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title><meta name="description" content="Explore WeSchool’s Global Citizen Leaders journey, five original student prototypes and opportunities for industry partnership."><link rel="icon" href="${base}favicon.svg">${(entry.css||[]).map(css=>`<link rel="stylesheet" href="${base}${css}">`).join('')}<link rel="canonical" href="https://tanmay7264.github.io${base}${route}"></head><body><div id="root">${render(route)}</div><script type="module" src="${base}${entry.file}"></script></body></html>`)}
await rm('.render',{recursive:true,force:true});
console.log('Built '+routes.length+' readable pages plus the interactive 3D world.');
