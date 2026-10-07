import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
export async function readAsset(requestUrl){
 let pathname;
 try{pathname=decodeURIComponent(new URL(requestUrl,'http://127.0.0.1').pathname)}catch{return null}
 if(pathname.includes('\0')||pathname.includes('\\'))return null;
 const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(resolve(root)+sep))return null;
 if(!types[extname(file)])return null;
 try{return {body:await readFile(file),type:types[extname(file)]}}catch(error){if(['ENOENT','EISDIR','ENOTDIR'].includes(error.code))return null;throw error}
}
