import {readFile,writeFile,mkdir,copyFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {courses} from './catalog.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),check=process.argv.includes('--check');
const shared=['model-utils.js','session.js','engine.js','scene.js','objects.js','audio.js','style.css','index.html','random-worker.js'];
let drift=[];
async function publish(target,text){text=text.replace(/\r\n?/g,'\n');if(check){let actual;try{actual=await readFile(target,'utf8');}catch{}if(actual?.replace(/\r\n?/g,'\n')!==text)drift.push(path.relative(root,target));}else await writeFile(target,text);}
for(const c of courses){
  const dir=path.join(root,'src',c.id);if(!check){await mkdir(dir,{recursive:true});for(const folder of ['vendor','audio'])await cp(path.join(root,'docs/courseware-template',folder),path.join(dir,folder),{recursive:true,force:false});}
  for(const name of shared){let text;try{text=await readFile(new URL(name,import.meta.url),'utf8');}catch{continue;}await publish(path.join(dir,name),text);}
  await publish(path.join(dir,'random-core.js'),await readFile(path.join(root,'scripts/random-rounds/core.js'),'utf8'));
  await publish(path.join(dir,'worker-client.js'),await readFile(path.join(root,'scripts/random-rounds/worker-client.js'),'utf8'));
  await publish(path.join(dir,'model.js'),`export * from './${c.id}-model.js';\n`);
  await publish(path.join(dir,'levels.js'),`// Titles and invitations for the nine authored levels.\nexport const course = ${JSON.stringify(c,null,2)};\n`);
  await publish(path.join(dir,'main.js'),"import { start } from './engine.js';\nstart();\n");
  await publish(path.join(dir,'course.json'),JSON.stringify({id:c.id,title:{zh:c.title[0],en:c.title[1]},description:{zh:c.invite[0]+'三章九关，支持撤销、提示和随机新局。',en:c.invite[1]+' Nine levels with undo, hints and new puzzles.'},category:c.category,levels:['primary'],grades:['g3','g4','g5','g6'],tags:c.tags,icon:c.icon,badge:'new',order:200+courses.indexOf(c)},null,2)+'\n');
}
if(drift.length){console.error(drift.join('\n'));process.exitCode=1;}else console.log(`${check?'Verified':'Synced'} ${courses.length} standalone adventure courses.`);
