import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {courses} from '../../scripts/adventure/catalog.mjs';
import {createObjectPool, makeObject, disposeObject} from '../../src/river-sandbox/objects.js';

const palette = {stage:'#eeeeee',tile:'#ccbbaa',wood:'#996633',metal:'#999999',dark:'#222222',
  red:'#cc2222',green:'#228833',blue:'#2255aa',yellow:'#ffee33',water:'#2288cc',paper:'#ffffff'};
const alternate = Object.fromEntries(Object.entries(palette).map(([k]) => [k, '#553366']));
const lamp = {id:'lamp',type:'lamp',x:0,z:0,on:false,target:false,label:'1',action:{type:'flip',cell:0}};
const disposeSpy = (mesh) => {
  const counts = new Map();
  mesh.traverse(node => {
    for (const resource of [node.geometry, ...(Array.isArray(node.material) ? node.material : [node.material])].filter(Boolean)) {
      counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
  });
  return counts;
};

test('unchanged objects, movements and themes reuse geometry and materials', () => {
  const group = new THREE.Group(), pool = createObjectPool(group);
  const entry = pool.sync([lamp], palette, 0)[0], mesh = entry.mesh;
  const geometry = mesh.children[0].geometry, material = mesh.children[0].material;
  for (let i = 0; i < 100; i++) assert.equal(pool.sync([{...lamp}], palette, i)[0].mesh, mesh);
  pool.sync([{...lamp, x:1, on:true, target:true}], alternate, 100);
  assert.equal(entry.mesh, mesh);
  assert.equal(mesh.children[0].geometry, geometry);
  assert.equal(mesh.children[0].material, material);
  const bulb = mesh.children.find(node => node.material?.userData.emissiveKey);
  assert.equal(bulb.material.emissiveIntensity, .65);
  assert.equal(bulb.material.color.getHexString(), '553366');
  assert.equal(bulb.material.emissive.getHexString(), '553366');
  pool.dispose();
});

test('continuous movement, redraws and undo interpolate from the current position', () => {
  const pool = createObjectPool(new THREE.Group());
  const entry = pool.sync([lamp], palette, 0)[0];
  pool.sync([{...lamp,x:1}], palette, 10);
  entry.mesh.position.x = .4;
  pool.sync([{...lamp,x:1}], alternate, 40);
  assert.equal(entry.start, 10, 'a redraw must not restart the movement');
  assert.equal(entry.mesh.position.x, .4);
  pool.sync([{...lamp,x:2}], alternate, 50);
  assert.equal(entry.from.x, .4);
  assert.equal(entry.target.x, 2);
  entry.mesh.position.x = .9;
  pool.sync([{...lamp,x:1}], alternate, 70);
  assert.equal(entry.from.x, .9);
  assert.equal(entry.target.x, 1);
  pool.dispose();
});

test('gear replacement and object removal dispose resources once and retain rotation', () => {
  const group = new THREE.Group(), pool = createObjectPool(group);
  const gear = {id:'g',type:'gear',teeth:12,pitch:.3,spin:1};
  const entry = pool.sync([gear], palette, 0)[0], original = entry.mesh, old = disposeSpy(original);
  original.userData.rotor.rotation.y = 1.25;
  pool.sync([{...gear,spin:2}], palette, 20);
  assert.equal(entry.mesh, original);
  pool.sync([{...gear,teeth:24,pitch:.6}], palette, 40);
  assert.notEqual(entry.mesh, original);
  assert.equal(entry.mesh.userData.rotor.rotation.y, 1.25);
  assert.ok([...old.values()].every(n => n === 1));
  const current = disposeSpy(entry.mesh);
  pool.sync([], palette, 60); pool.dispose();
  assert.equal(group.children.length, 0);
  assert.ok([...current.values()].every(n => n === 1));
  assert.ok([...old.values()].every(n => n === 1));
});

test('river flow updates water and sediment without rebuilding the cell', () => {
  const pool = createObjectPool(new THREE.Group());
  const cell = {id:'cell',type:'land',depth:1,water:.1,silt:.2};
  const entry = pool.sync([cell], palette, 0)[0], mesh = entry.mesh;
  const geometries = mesh.children.map(n => n.geometry);
  pool.sync([{...cell,water:.4,silt:.3}], palette, 10);
  assert.equal(entry.mesh, mesh);
  assert.deepEqual(mesh.children.map(n => n.geometry), geometries);
  const water = mesh.children.find(n => n.material?.userData.paletteKey === 'water');
  assert.ok(Math.abs(water.scale.y * .03 - .13) < 1e-10);
  pool.sync([{...cell,water:0,silt:0}], palette, 20);
  assert.equal(water.visible, false);
  pool.sync([cell], alternate, 30);
  assert.equal(water.visible, true);
  assert.equal(water.material.color.getHexString(), '553366');
  assert.deepEqual(mesh.children.map(n => n.geometry), geometries);
  pool.dispose();
});

function appearance(mesh) {
  mesh.updateMatrixWorld(true);
  const result = [], round = n => Math.round(n * 1e6) / 1e6;
  mesh.traverseVisible(node => {
    if (!node.isMesh) return;
    node.geometry.computeBoundingBox();
    const box = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld), m = node.material;
    result.push(JSON.stringify({bounds:[...box.min.toArray(),...box.max.toArray()].map(round),
      color:m.color.getHexString(),emissive:m.emissive.getHexString(),intensity:m.emissiveIntensity,
      metalness:m.metalness,roughness:m.roughness,opacity:m.opacity,shadow:node.castShadow}));
  });
  return result.sort();
}

test('all nine courses preserve visible objects through play, undo, theme changes and restart', async () => {
  for (const {id} of courses) {
    const model = await import(`../../src/${id}/${id}-model.js`);
    for (const index of [0, 8]) {
      const level = model.makeLevel(index), states = [model.initial(level)];
      for (const action of model.solve(level)) {
        const result = model.apply(level, states.at(-1), action);
        assert.equal(result.ok, true); states.push(result.state);
      }
      const pool = createObjectPool(new THREE.Group());
      const checkpoints = [states[0],states[Math.floor(states.length/2)],states.at(-1),states.at(-2),states[0]];
      for (const [i,state] of checkpoints.entries()) {
        const colors = i % 2 ? alternate : palette;
        for (const entry of pool.sync(model.view(level,state).objects, colors, i*200)) {
          entry.mesh.position.copy(entry.target);
          const fresh = makeObject(entry.o, colors);
          assert.deepEqual(appearance(entry.mesh), appearance(fresh), `${id}/${index}/${entry.o.id}`);
          disposeObject(fresh);
        }
      }
      pool.dispose();
    }
  }
});

test('scene labels retain identity and dispatch the latest action after a redraw', async () => {
  const source = (await readFile(new URL('../../scripts/adventure/scene.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace('export function createScene', 'function createScene');
  class Element {
    constructor(tag='DIV') { this.tagName=tag.toUpperCase();this.dataset={};this.style={};this.children=[];this.handlers={};this.attributes={}; }
    addEventListener(name,fn) { this.handlers[name]=fn; }
    setAttribute(name,value) { this.attributes[name]=value; }
    append(child) { child.parent=this;this.children.push(child); }
    remove() { if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this); }
    set textContent(value) { this.text=value;this.children=[]; }
    getBoundingClientRect() { return {left:0,top:0,width:800,height:600}; }
  }
  class Renderer {
    constructor(){this.shadowMap={};}
    setPixelRatio(){} setSize(){} dispose(){} render(){}
  }
  let lang='zh', colors=palette;
  const actions=[], labels=new Element(),canvas=new Element();
  const context=vm.createContext({
    T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:class {fromScene(){return {texture:null,dispose(){}};}dispose(){}}},
    RoomEnvironment:class {dispose(){}},createObjectPool,
    devicePixelRatio:1,innerWidth:800,innerHeight:600,performance:{now:()=>0},
    document:{documentElement:{},hidden:false,createElement:tag=>new Element(tag)},
    window:{addEventListener(){},removeEventListener(){}},ResizeObserver:class {observe(){} disconnect(){}},
    getComputedStyle:()=>({getPropertyValue:key=>colors[key.slice(2)]}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  });
  vm.runInContext(`${source}\nglobalThis.create=createScene;`,context);
  const scene=context.create({canvas,area:new Element(),labels,onAction:a=>actions.push(a),language:()=>lang});
  scene.update({size:7,objects:[lamp]});
  const label=labels.children[0];
  lang='en';colors=alternate;
  const changed={...lamp,on:true,target:true,action:{type:'flip',cell:3}};
  scene.update({size:7,objects:[changed]});
  assert.equal(labels.children[0],label);
  assert.equal(label.attributes['aria-label'],'Switch 1');
  assert.equal(label.dataset.lit,'true');
  label.handlers.click();assert.deepEqual(actions,[changed.action]);
  scene.update({size:7,objects:[{...changed,label:undefined,action:undefined}]});
  assert.equal(labels.children.length,0);
  scene.destroy();
});
