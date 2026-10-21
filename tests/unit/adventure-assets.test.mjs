import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat,readdir} from 'node:fs/promises';import {courses} from '../../scripts/adventure/catalog.mjs';
test('adventure shared author files, canonical RNG and local audio/vendor assets stay synchronized',async()=>{
  const names=['model-utils.js','session.js','engine.js','scene.js','objects.js','audio.js','style.css','index.html','random-worker.js'];
  for(const c of courses){const root=new URL(`../../src/${c.id}/`,import.meta.url);for(const name of names)assert.equal((await readFile(new URL(name,root),'utf8')).replace(/\r\n/g,'\n'),(await readFile(new URL('../../scripts/adventure/'+name,import.meta.url),'utf8')).replace(/\r\n/g,'\n'),`${c.id}/${name}`);
    assert.equal(await readFile(new URL('random-core.js',root),'utf8'),(await readFile(new URL('../../scripts/random-rounds/core.js',import.meta.url),'utf8')).replace(/\r\n/g,'\n'));
    for(const file of ['audio/lab-glow.ogg','vendor/three.module.min.js','vendor/RoomEnvironment.js','vendor/RoundedBoxGeometry.js'])assert.ok((await stat(new URL(file,root))).size>100);
    const files=await readdir(root);for(const name of files.filter(f=>f.endsWith('.js'))){const text=await readFile(new URL(name,root),'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+)['"]/g))assert.ok((await stat(new URL(match[1],root))).isFile(),`${c.id}: ${match[1]}`);}
  }
});
