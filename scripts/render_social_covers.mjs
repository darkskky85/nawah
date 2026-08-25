import {readdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch(error){
  console.error('Sharp is required for one-time SVG to PNG conversion. Set NODE_PATH to a runtime containing sharp.');
  process.exit(1);
}
const assets=join(dirname(fileURLToPath(import.meta.url)),'..','assets');
const dir=join(assets,'covers');
const files=(await readdir(dir)).filter(x=>x.endsWith('.svg'));
for(const file of files){
  await sharp(join(dir,file),{density:144}).resize(1200,630,{fit:'fill'}).png({compressionLevel:9,palette:true,quality:92}).toFile(join(dir,file.replace(/\.svg$/,'.png')));
}
await sharp(join(assets,'favicon.svg'),{density:192}).resize(192,192).png({compressionLevel:9,palette:true}).toFile(join(assets,'icon-192.png'));
await sharp(join(assets,'favicon.svg'),{density:256}).resize(512,512).png({compressionLevel:9,palette:true}).toFile(join(assets,'icon-512.png'));
console.log(`Rendered ${files.length} PNG social covers and two warm-brand app icons.`);
