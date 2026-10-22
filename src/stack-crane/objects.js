import * as T from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

function materialColor(o,key,p){
  if(key==='primary')key=['blue','red','green','yellow'][Math.abs(o.color||0)%4];
  if(key==='status')key=o.type==='lamp'?(o.on?'yellow':'metal'):o.on?'green':o.type==='dock'?'yellow':o.type==='crate'?'wood':'red';
  if(key==='target')key=o.target?'yellow':'dark';
  return p[key]||key;
}

export function updateObject(g,o,p){
  g.userData.update?.(o);
  g.traverse(node=>{
    for(const m of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){
      if(m.userData.paletteKey)m.color.set(materialColor(o,m.userData.paletteKey,p));
      if(m.userData.emissiveKey){m.emissive.set(p[m.userData.emissiveKey]);m.emissiveIntensity=o.on?.65:0;}
    }
  });
  if(o.type==='train')g.rotation.y=o.heading||0;
  g.userData.descriptor=o;
}

export function disposeObject(g){
  g.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});
}

// Presentation metadata, transforms and values handled by updateObject do not
// change geometry. Keep unknown fields in the key so new shapes fail safely.
function shapeKey(o){
  const ignored=new Set(['id','label','action','draggable','spin','color','heading']);
  if(o.type!=='rail')for(const key of ['x','y','z'])ignored.add(key);
  if(['dock','crate','lamp','train'].includes(o.type))ignored.add('on');
  if(o.type==='lamp')ignored.add('target');
  if(o.type==='land'){ignored.add('water');ignored.add('silt');}
  return JSON.stringify(Object.keys(o).sort().filter(k=>!ignored.has(k)).map(k=>{
    const value=k==='pollen'&&o.type==='bee'?Boolean(o[k]):k==='phase'&&o.type==='flower'?(o[k]===3?3:o[k]>=1?1:0):o[k];
    return [k,value];
  }));
}

export function createObjectPool(group){
  const byId=new Map();
  return {
    sync(objects,palette,now){
      const keep=new Set(),entries=[],paletteKey=JSON.stringify(palette);
      for(const o of objects){
        keep.add(o.id);
        const shape=shapeKey(o),appearance=JSON.stringify([paletteKey,o.color,o.on,o.target,o.heading,o.water,o.silt]);
        let entry=byId.get(o.id);
        const replaced=entry&&entry.shape!==shape;
        if(!entry||replaced){
          const from=entry?.mesh.position.clone(),rotation=entry?.mesh.userData.rotor?.rotation.y||0;
          if(entry){group.remove(entry.mesh);disposeObject(entry.mesh);}
          const mesh=makeObject(o,palette),target=mesh.position.clone();
          if(mesh.userData.rotor)mesh.userData.rotor.rotation.y=rotation;
          group.add(mesh);
          // Keep the entry identity too: pointer capture may still refer to it.
          entry=Object.assign(entry||{},{mesh,target,from:from||target.clone(),start:now,shape,appearance});
          mesh.position.copy(entry.from);byId.set(o.id,entry);
        }else{
          const target=entry.target.clone().set(o.x||0,o.y||0,o.z||0);
          if(!target.equals(entry.target)){
            entry.from.copy(entry.mesh.position);entry.target.copy(target);entry.start=now;
          }
          if(entry.appearance!==appearance){updateObject(entry.mesh,o,palette);entry.appearance=appearance;}
        }
        entry.o=o;entry.mesh.userData.descriptor=o;entries.push(entry);
      }
      for(const [id,entry] of byId)if(!keep.has(id)){
        group.remove(entry.mesh);disposeObject(entry.mesh);entry.label?.remove();byId.delete(id);
      }
      return entries;
    },
    dispose(){for(const entry of byId.values()){group.remove(entry.mesh);disposeObject(entry.mesh);entry.label?.remove();}byId.clear();},
  };
}

export function makeObject(o,p){
  const g=new T.Group(),mat=(key,metal=0,rough=.6)=>{const material=new T.MeshStandardMaterial({color:materialColor(o,key,p),metalness:metal,roughness:rough});material.userData.paletteKey=key;return material;};
  const color='primary';
  const add=(geo,m,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;};
  const box=(w,h,d,key,x=0,y=h/2,z=0)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.12),mat(key),x,y,z);
  const sphere=(r,key,x=0,y=0,z=0)=>add(new T.SphereGeometry(r,16,12),mat(key),x,y,z);
  const cylinder=(r,h,key,x=0,y=h/2,z=0)=>add(new T.CylinderGeometry(r,r,h,24),mat(key,key==='metal'?.7:0),x,y,z);
  const beam=(a,b,r,key)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),m=add(new T.CylinderGeometry(r*.8,r,from.distanceTo(to),8),mat(key));m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return m;};
  const wheels=(wide=.28,long=.27)=>{for(const x of [-wide,wide])for(const z of [-long,long]){const wheel=cylinder(.105,.07,'dark',x,.11,z);wheel.rotation.z=Math.PI/2;cylinder(.05,.08,'metal',x,.11,z).rotation.z=Math.PI/2;}};
  switch(o.type){
    case 'base':box(o.w,.3,o.h,'wood',0,-.27);box(o.w-.12,.06,o.h-.12,'tile',0,-.1);break;
    case 'tree':cylinder(.08,.65,'wood');sphere(.38,'green',0,.85);sphere(.28,'green',-.17,1.12);break;
    case 'tile':box(.96,.09,.96,'tile',0,-.045);break;
    case 'grass':box(.96,.1,.96,'green',0,-.05);break;
    case 'wall':box(.94,.5,.94,'wood');box(.97,.06,.97,'paper',0,.53);break;
    case 'hedge':box(.9,.5,.9,'green');for(const x of [-.23,.2])sphere(.3,'green',x,.5,0);break;
    case 'dock':{box(.88,.06,.88,'status');const ring=add(new T.TorusGeometry(.32,.025,6,40),mat('paper'),0,.08,0);ring.rotation.x=-Math.PI/2;break;}
    case 'crate':{
      box(.62,.54,.62,'status');for(const x of [-.25,.25])box(.05,.58,.66,'yellow',x,.29);for(const z of [-.25,.25])box(.65,.58,.05,'wood',0,.29,z);box(.62,.05,.12,'yellow',0,.56);break;
    }
    case 'robot':{
      box(.66,.25,.58,color,0,.24);box(.42,.35,.36,'metal',0,.51);box(.34,.15,.025,'dark',0,.57,-.195);sphere(.034,'yellow',-.085,.59,-.22);sphere(.034,'yellow',.085,.59,-.22);cylinder(.03,.17,'metal',0,.76);sphere(.06,color,0,.88);wheels();if(o.cargo)box(.38,.35,.38,'wood',0,.85,.12);break;
    }
    case 'lamp':{
      cylinder(.42,.12,'dark');cylinder(.34,.05,'metal',0,.14);const bulb=sphere(.29,'status',0,.4);bulb.material.userData.emissiveKey='yellow';box(.12,.05,.12,'target',.32,.12,.32);break;
    }
    case 'rail':{
      const dx=o.to[0]-o.x,dz=o.to[1]-o.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);g.rotation.y=angle;
      for(let i=0;i<=Math.ceil(len/.25);i++)box(.58,.075,.09,'wood',0,0,i*len/Math.ceil(len/.25));
      for(const x of [-.19,.19])box(.045,.08,len+.1,'metal',x,.07,len/2);break;
    }
    case 'train':{
      box(.57,.15,.94,color,0,.24);box(.55,.55,.34,color,0,.55,.24);box(.6,.08,.43,'dark',0,.87,.24);box(.4,.25,.035,'metal',0,.61,.045);const boiler=cylinder(.23,.52,color,0,.53,-.22);boiler.rotation.x=Math.PI/2;cylinder(.08,.25,'dark',0,.82,-.32);sphere(.07,'yellow',0,.53,-.53);wheels(.3,.32);g.rotation.y=o.heading||0;break;
    }
    case 'station':{
      box(1,.12,.85,'paper');for(const x of [-.38,.38])box(.06,.65,.06,'wood',x,.42,.25);box(1.12,.12,.86,color,0,.8);box(.4,.28,.08,'paper',0,.56,.2);break;
    }
    case 'lever':{
      cylinder(.21,.1,'dark',0,.12,.43);const stem=beam([0,.17,.43],[o.on?.15:-.15,.64,.43],.04,'metal');sphere(.095,'status',o.on?.15:-.15,.64,.43);break;
    }
    case 'gear':{
      cylinder(.12,.55,'metal',0,.2);cylinder(.28,.09,'dark',0,.045);if(!o.teeth)break;
      const spinning=new T.Group();spinning.position.y=.28;g.add(spinning);g.userData.rotor=spinning;
      const rim=new T.Mesh(new T.CylinderGeometry(o.pitch-.025,o.pitch-.025,.13,Math.max(24,o.teeth*2)),mat(color,.55,.3));spinning.add(rim);rim.castShadow=true;
      for(let i=0;i<o.teeth;i++){const a=i*Math.PI*2/o.teeth,mesh=new T.Mesh(new T.BoxGeometry(.048,.14,.07),mat(color,.55,.3));mesh.position.set(Math.sin(a)*o.pitch,0,Math.cos(a)*o.pitch);mesh.rotation.y=a;mesh.castShadow=true;spinning.add(mesh);}
      for(let i=0;i<4;i++){const hole=new T.Mesh(new T.CylinderGeometry(o.pitch*.14,o.pitch*.14,.012,12),mat('dark'));hole.position.set(Math.sin(i*Math.PI/2)*o.pitch*.56,.075,Math.cos(i*Math.PI/2)*o.pitch*.56);spinning.add(hole);}cylinder(.12,.08,'metal',0,.39);break;
    }
    case 'ride':{
      cylinder(.62,.14,'wood');cylinder(.07,1.1,'metal');const top=new T.Group();top.position.y=.75;g.add(top);g.userData.rotor=top;
      const canopy=new T.Mesh(new T.ConeGeometry(.75,.5,24),mat('red'));canopy.position.y=.48;top.add(canopy);for(let i=0;i<4;i++){const a=i*Math.PI/2,seat=new T.Mesh(new RoundedBoxGeometry(.24,.19,.28,2,.035),mat(['yellow','blue','green','paper'][i]));seat.position.set(Math.cos(a)*.48,-.27,Math.sin(a)*.48);top.add(seat);}break;
    }
    case 'land':{
      box(.97,o.depth?.08:.3,.97,o.depth?'wood':'green',0,o.depth?-.06:.05);
      let water=null;const sediment=[];
      g.userData.update=next=>{
        if(next.water>.01&&!water){water=box(.84,.03,.84,'water');water.material.transparent=true;water.material.opacity=.8;water.material.roughness=.15;}
        if(water){water.visible=next.water>.01;water.scale.y=(.03+Math.min(next.water||0,.5)*.25)/.03;water.position.y=.07+Math.min(next.water||0,.5)*.06;}
        if(next.silt>.01&&!sediment.length)for(let i=0;i<5;i++)sediment.push(sphere(.045,'wood',Math.sin(i*3)*.23,.11,Math.cos(i*4)*.23));
        for(const grain of sediment)grain.visible=next.silt>.01;
      };
      if(o.bank)for(const z of [-.44,.44])box(.92,.19,.1,'metal',0,.12,z);
      if(o.pool){const ring=add(new T.TorusGeometry(.3,.045,8,24),mat('yellow'),0,.1,0);ring.rotation.x=-Math.PI/2;}
      if(o.on)box(.85,.06,.13,'yellow',0,.05,.41);if(o.source)beam([-.22,.3,0],[.22,.3,0],.04,'blue');break;
    }
    case 'house':{
      box(.65,.6,.6,'paper');const roof=add(new T.ConeGeometry(.55,.4,4),mat('red'),0,.8);roof.rotation.y=Math.PI/4;box(.16,.3,.02,'wood',0,.15,-.31);break;
    }
    case 'flower':{
      cylinder(.25,.23,'wood');beam([0,.2,0],[0,.75,0],.04,'green');const leaf=sphere(.18,'green',-.13,.42,0);leaf.scale.set(1,.3,.6);
      if(o.phase===3){for(let i=0;i<6;i++){const a=i*Math.PI/3,fruit=sphere(.22,'yellow',Math.cos(a)*.11,.37,Math.sin(a)*.11);fruit.scale.y=.85;}beam([0,.52,0],[.04,.7,0],.04,'green');}
      else{for(let i=0;i<5;i++){const a=i*Math.PI*2/5,petal=sphere(.2,'yellow',Math.cos(a)*.18,.76,Math.sin(a)*.18);petal.scale.set(1,.28,1);}sphere(.13,o.sex==='male'?'yellow':'green',0,.83);if(o.sex==='female')sphere(.11,'green',0,.62);if(o.phase>=1)for(let i=0;i<4;i++)sphere(.022,'wood',Math.sin(i)*.055,.94,Math.cos(i)*.055);}
      break;
    }
    case 'bee':{
      const body=sphere(.22,'yellow',0,.98,0);body.scale.z=1.4;for(const z of [-.13,.02,.16]){const stripe=add(new T.TorusGeometry(.205,.025,6,20),mat('dark'),0,.98,z);}
      sphere(.16,'dark',0,1,-.29);sphere(.05,'paper',-.07,1.04,-.42);sphere(.05,'paper',.07,1.04,-.42);
      for(const x of [-.2,.2]){const wing=sphere(.22,'paper',x,1.15,0);wing.scale.set(1,.12,.65);wing.material.transparent=true;wing.material.opacity=.7;}
      if(o.pollen)for(const x of [-.2,.2])sphere(.07,'yellow',x,.84,.05);break;
    }
    case 'planter':box(1,.3,.8,'wood');box(.85,.04,.66,'dark',0,.32);break;
    case 'branch':{
      const mesh=beam([o.from[0],o.from[1]+.3,0],[o.to[0],o.to[1]+.3,0],o.ghost?.024:Math.max(.025,.1-o.depth*.012),o.ghost?'metal':'wood');
      if(o.ghost){mesh.material.transparent=true;mesh.material.opacity=.3;mesh.castShadow=false;}else if(o.depth>=3){const leaf=sphere(.1,'green',o.to[0],o.to[1]+.3,0);leaf.scale.set(1.6,.7,.6);}break;
    }
    case 'orb':sphere(o.r,'red');break;
    case 'belt':{
      box(1.18,.18,2.5,'dark',0,.03,.8);for(let i=0;i<9;i++){const roller=cylinder(.055,1.05,'metal',0,.15,-.27+i*.26);roller.rotation.z=Math.PI/2;}break;
    }
    case 'rack':{
      box(1,.12,1,'dark');for(const x of [-.4,.4])for(const z of [-.4,.4])box(.06,3,.06,'metal',x,1.5,z);break;
    }
    case 'crane':{
      for(const x of [-2.6,3.5])box(.16,3.8,.16,'yellow',x,1.9,1);box(6.4,.18,.25,'yellow',.45,3.8,1);box(.55,.32,.45,'dark',0,3.5,1);beam([0,3.4,1],[0,2.6,1],.024,'metal');for(const x of [-.2,.2])beam([0,2.6,1],[x,2.3,1],.035,'metal');break;
    }
    default:box(.5,.5,.5,color);
  }
  g.position.set(o.x||0,o.y||0,o.z||0);updateObject(g,o,p);return g;
}
