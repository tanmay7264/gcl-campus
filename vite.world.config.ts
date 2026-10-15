import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/weschool-gcl/world/',publicDir:'world-public',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('./world-src',import.meta.url))}},build:{outDir:'world',emptyOutDir:true,manifest:true,rollupOptions:{input:'world-src/main.tsx'}},server:{port:5174}});
