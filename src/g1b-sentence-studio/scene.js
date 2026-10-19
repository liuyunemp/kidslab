import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { valueOf, moneyValue } from './exploration-model.js';

export function createScene(canvas, course, { onDrop, onGesture, onActivate }) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-9,9,6,-6,.1,100);
  camera.position.set(0,10,13); camera.lookAt(0,0,0);
  const pmrem = new THREE.PMREMGenerator(renderer), environment = new RoomEnvironment();
  const env = pmrem.fromScene(environment,.04); scene.environment = env.texture;
  environment.dispose(); pmrem.dispose(); scene.environmentIntensity=.65;
  scene.add(new THREE.HemisphereLight(0xffffff,0x715b84,.8));
  const sun = new THREE.DirectionalLight(0xfff0d1,2.2);
  sun.position.set(-5,10,5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10; sun.shadow.normalBias = .035; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xe2f0ff,.6); fill.position.set(8,5,-5); scene.add(fill);
  const world = new THREE.Group(); scene.add(world);
  let objects = new THREE.Group(); world.add(objects);
  const materials = new Map(), geometries = new Map();
  const palette = { wood:0xdab07d, edge:0x9e7050, cream:0xfff5dc, blue:0x369fc2, coral:0xe97962, mint:0x67b897, yellow:0xf3c761, purple:0x927dca, dark:0x343249, white:0xffffff };
  function mat(color, metalness=0) {
    const key = `${color}:${metalness}`;
    if (!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metalness?.3:.52,metalness}));
    return materials.get(key);
  }
  function geo(key, make) { if (!geometries.has(key)) geometries.set(key,make()); return geometries.get(key); }
  const round = geo('round',()=>new RoundedBoxGeometry(1,1,1,3,.08));
  const sphere = geo('sphere',()=>new THREE.SphereGeometry(1,20,14));
  function mesh(g,m,parent=objects) { const v = new THREE.Mesh(g,m); v.castShadow = true; v.receiveShadow = true; parent.add(v); return v; }
  function box(x,y,z,w,h,d,color,parent=objects) { const m=mesh(round,mat(color),parent); m.position.set(x,y,z); m.scale.set(w,h,d); return m; }
  function ball(x,y,z,r,color,parent=objects,sx=1,sy=1,sz=1) { const m=mesh(sphere,mat(color),parent); m.position.set(x,y,z); m.scale.set(r*sx,r*sy,r*sz); return m; }
  function cylinder(x,y,z,r,h,color,parent=objects) { const m=mesh(geo(`cylinder${r}:${h}`,()=>new THREE.CylinderGeometry(r,r,h,32)),mat(color),parent); m.position.set(x,y,z); return m; }
  function clear() {
    objects.traverse(o=>{ if (o.userData.label) { o.material.map.dispose(); o.material.dispose(); o.geometry.dispose(); } });
    world.remove(objects); objects=new THREE.Group(); world.add(objects);
  }
  function label(value,x,y,z,width=2,parent=objects) {
    const el=document.createElement('canvas'),ratio=String(value).length===1?1:Math.max(1.5,String(value).length*.65);el.width=Math.round(256*ratio); el.height=256;
    const ctx=el.getContext('2d'); ctx.fillStyle='#fff9e9';ctx.fillRect(0,0,el.width,256);
    ctx.fillStyle='#302d43';ctx.font='bold 194px "Microsoft YaHei", sans-serif'; ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(value),el.width/2,137,el.width-20);
    const texture=new THREE.CanvasTexture(el); texture.colorSpace=THREE.SRGBColorSpace;
    const plane=mesh(new THREE.PlaneGeometry(width,width/ratio),new THREE.MeshStandardMaterial({map:texture,roughness:.9,toneMapped:false}),parent);plane.castShadow=false;
    plane.userData.label=true; plane.position.set(x,y,z); plane.rotation.x=-Math.PI/2; return plane;
  }
  function desk() {
    box(0,-.48,0,10.5,.72,6.6,palette.wood);
    box(0,-.1,0,10.1,.12,6.2,palette.cream);
    for(const x of [-4.2,4.2]) for(const z of [-2.6,2.6]) box(x,-1.3,z,.4,1.3,.4,palette.edge);
    for(let i=0;i<4;i++) box(-4.8+i*.11,-.05,0,.025,.015,5.7,0xccad83);
  }
  function hundredChart(value) {
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1000;
    const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 46px sans-serif';
    for(let n=1;n<=100;n++){const x=(n-1)%10*100,z=Math.floor((n-1)/10)*100;ctx.fillStyle=n===value?'#a8d6c6':'#fff9e9';ctx.fillRect(x,z,100,100);ctx.strokeStyle='#9e7050';ctx.strokeRect(x,z,100,100);ctx.fillStyle='#303443';ctx.fillText(n,x+50,z+50);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const chart=mesh(new THREE.PlaneGeometry(4.2,4.2),new THREE.MeshStandardMaterial({map:texture,roughness:.9,toneMapped:false}));chart.userData.label=true;chart.castShadow=false;chart.rotation.x=-Math.PI/2;chart.position.set(2.19,.08,-.11);
  }
  function counters(n,x,z,color,group=objects) {
    if (!n) return;
    const count=Math.max(0,Math.min(n,100));
    const instance=new THREE.InstancedMesh(round,mat(color),count); instance.castShadow=true;instance.receiveShadow=true;
    const matrix=new THREE.Matrix4();
    for(let i=0;i<count;i++) matrix.compose(new THREE.Vector3(x+(i%10)*.26,.18,z+Math.floor(i/10)*.29),new THREE.Quaternion(),new THREE.Vector3(.2,.25,.2)),instance.setMatrixAt(i,matrix);
    group.add(instance);
  }
  function bank(tens,ones,x,z,color) {
    for(let i=0;i<tens;i++) {
      box(x+i*.25,.17,z,.18,.28,2.55,color);
      for(let j=1;j<10;j++) box(x+i*.25,.315,z-1.28+j*.255,.19,.015,.025,palette.cream);
    }
    counters(ones,x,z+1.55,palette.yellow);
  }
  function train(x,z,color) {
    const g=new THREE.Group();objects.add(g);g.position.set(x,.1,z);
    box(0,.38,0,1.6,.55,.85,color,g); box(-.3,.86,0,.7,.65,.72,color,g);
    box(-.3,.88,.37,.42,.32,.04,palette.cream,g);
    for(const dx of [-.5,.5]) for(const dz of [-.48,.48]) { const w=cylinder(dx,.12,dz,.23,.12,palette.dark,g);w.rotation.x=Math.PI/2; }
    return g;
  }
  function prop(type,x,z,scale=1,parent=objects) {
    const g=new THREE.Group();parent.add(g);g.position.set(x,.1,z);g.scale.setScalar(scale);
    if(type==='tree') {
      cylinder(0,.7,0,.15,1.4,palette.edge,g);
      ball(0,1.75,0,.82,palette.mint,g);ball(-.5,1.45,.1,.55,0x88c77d,g);ball(.5,1.48,-.15,.5,0x7fb29b,g);
    } else if(['chick','rooster','duck','frog','person','ant','bird'].includes(type)) {
      const color=type==='rooster'?palette.white:type==='bird'?palette.dark:type==='frog'?palette.mint:type==='duck'?palette.cream:type==='ant'?palette.edge:type==='person'?palette.coral:palette.yellow;
      ball(0,.4,0,.45,color,g,1,1.2,1);ball(0,1.02,0,.36,color,g);
      for(const dx of [-.14,.14]) {ball(dx,1.1,.3,.075,palette.white,g);ball(dx,1.1,.36,.038,palette.dark,g);}
      if(['duck','chick','rooster','bird'].includes(type)) ball(0,.93,.39,.18,palette.coral,g,1,.35,1);
      if(type==='rooster'){for(let i=0;i<3;i++)ball(0,1.4,-.12+i*.14,.14,palette.coral,g);ball(0,.82,.34,.15,palette.coral,g);for(let i=0;i<3;i++)ball((i-1)*.18,.6,-.48,.35,palette.white,g,.3,1.5,1);}
      for(const dx of [-.24,.24]) ball(dx,.06,.16,.18,palette.coral,g,1,.35,1.5);
      if(type==='person') {ball(0,1.25,-.02,.32,palette.dark,g,1,.5,1);box(-.5,.5,0,.18,.6,.2,color,g);box(.5,.5,0,.18,.6,.2,color,g);}
    } else if(type==='boat') {
      box(0,.16,0,1.8,.3,.7,palette.edge,g);box(0,.33,0,1.5,.15,.54,palette.cream,g);
      prop('person',0,0,.55,g); const oar=box(.85,.4,0,.08,.08,1.8,palette.wood,g);oar.rotation.y=.5;
    } else if(type==='moon'||type==='sun'||type==='heart') {
      ball(0,1.15,0,.65,type==='heart'?palette.coral:palette.yellow,g); 
      if(type==='moon')ball(.3,1.4,.1,.52,0x8c9caf,g);
    } else if(type==='book') {
      box(0,.12,0,1.3,.25,1.6,palette.coral,g);box(0,.28,0,1.18,.09,1.5,palette.cream,g);label('书',0,.34,0,.9,g);
    } else if(type==='lotus'||type==='white-lotus'||type==='leaf'||type==='flower') {
      const leaf=ball(0,.12,0,.8,palette.mint,g,1,.08,1);
      if(type!=='leaf')for(let i=0;i<7;i++){const q=i*Math.PI*2/7;ball(Math.cos(q)*.27,.38,Math.sin(q)*.27,.33,type==='white-lotus'?palette.white:0xeaa3b1,g,.6,.85,1);}
      void leaf;
    } else if(type==='water'||type==='cloud') {
      for(let i=0;i<4;i++) ball((i-1.5)*.32,.45,0,.45,type==='cloud'?palette.white:palette.blue,g,1,.65,1);
    } else if(type==='dragonfly'||type==='worm') {
      for(let i=0;i<5;i++)ball(i*.14,.5,0,.12,palette.coral,g);
      if(type==='dragonfly')for(const dz of [-.25,.25])ball(.25,.55,dz,.36,palette.cream,g,.9,.05,1);
    } else if(type==='well') {
      cylinder(0,.3,0,.7,.6,palette.wood,g);cylinder(0,.62,0,.5,.025,palette.blue,g);
      box(-.8,1,0,.14,1.7,.14,palette.edge,g);box(.8,1,0,.14,1.7,.14,palette.edge,g);box(0,1.85,0,2,.18,.9,palette.coral,g);
    } else if(type==='shuttlecock'){cylinder(0,.13,0,.3,.2,palette.coral,g);for(let i=0;i<5;i++){const q=i*Math.PI*2/5;const feather=ball(Math.cos(q)*.15,.65,Math.sin(q)*.15,.42,palette.white,g,.25,1,.3);feather.rotation.z=Math.sin(q)*.25;}}
    else if(type==='trousers') {box(-.25,.4,0,.4,.8,.15,palette.blue,g);box(.25,.4,0,.4,.8,.15,palette.blue,g);box(0,.9,0,.95,.3,.15,palette.blue,g);
    } else if(type==='square')box(0,.2,0,1.4,.3,1.4,palette.coral,g);
    else if(type==='round')cylinder(0,.2,0,.7,.3,palette.blue,g);
    else if(type==='fish'){ball(0,.5,0,.5,palette.coral,g,1.4,.6,.5);ball(-.65,.5,0,.3,palette.yellow,g,.5,1,.5);ball(.4,.6,.22,.07,palette.dark,g);
    } else if(type==='brush') {
      box(0,.2,0,.2,.15,1.8,palette.blue,g); box(0,.32,-.65,.35,.12,.55,palette.cream,g);
    } else if(type==='cloth') box(0,.15,0,1.1,.12,1.4,palette.mint,g);
    else if(type==='bowl') {cylinder(0,.25,0,.6,.5,palette.cream,g);ball(0,.53,0,.42,palette.mint,g,1,.5,1);}
    else ball(0,.45,0,.48,type==='ball'?palette.yellow:palette.coral,g);
    return g;
  }
  let animated=[], shapes=[], activity, room, pulse=0, clock=0, yaw=0, drag=null, lastW=0,lastH=0;
  function update(a,r,lang='zh') {
    const oldShapes=activity?.id===a.id?shapes.map(s=>s.position.clone()):[];canvas.dataset.settled="false";
    activity=a;room=r;clear();desk();animated=[];shapes=[];
    if(course.category==='math') {
      if(course.kind==='shape') {
        const shapesData={triangle:[[-.7,-.65],[.7,-.65],[0,.7]],square:[[-.6,-.6],[.6,-.6],[.6,.6],[-.6,.6]],rectangle:[[-.9,-.5],[.9,-.5],[.9,.5],[-.9,.5]],parallelogram:[[-.9,-.5],[.35,-.5],[.9,.5],[-.35,.5]]};
        a.pieces.forEach((type,i)=>{
          let geometry;
          if(type==='circle')geometry=geo('flatcircle',()=>new THREE.CylinderGeometry(.6,.6,.2,48));
          else geometry=geo('shape:'+type,()=>{const s=new THREE.Shape();shapesData[type].forEach(([x,z],j)=>j?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.16,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1});g.rotateX(-Math.PI/2);return g;});
          const item=mesh(geometry,mat([palette.blue,palette.coral,palette.yellow,palette.mint,palette.purple][i%5]));
          item.position.set(r.positions[i].x,.35,r.positions[i].z);item.userData.target=item.position.clone();if(oldShapes[i])item.position.copy(oldShapes[i]);item.rotation.y=r.rotations[i]*Math.PI/4;item.userData.piece=i;shapes.push(item);
        });
        for(let x=-4;x<=4;x++)box(x,.012,0,.018,.01,4.6,0xc9c4b2);
        for(let z=-2;z<=2;z++)box(0,.012,z,8,.01,.018,0xc9c4b2);
      } else if(course.kind==='money') {
        box(-3,1.05,-.6,2.4,2.3,1.4,palette.blue);box(-3,1.35,.12,1.8,1.15,.12,palette.cream);
        label('¥',-3,2.23,-.6,1.2);box(-3,.38,.22,1.8,.18,.7,palette.dark);
        prop('fruit',-3,.42,.45);
        box(.8,.02,.1,5.7,.12,4.8,palette.edge);box(.8,.09,.1,5.4,.06,4.5,palette.cream);
        const amount=v=>[Math.floor(v/100),Math.floor(v%100/10),v%10].map((n,i)=>n?`${n}${(lang==='zh'?['元','角','分']:['yuan','jiao','fen'])[i]}`:'').join(' ').trim()||'0';
        let idx=0;for(const [v,count] of Object.entries(r.tray)){for(let i=0;i<Math.min(count,15);i++){const x=-1.35+(idx%6)*.8,z=-1.4+Math.floor(idx/6)*.8;if(Number(v)>=500)box(x,.2,z,.65,.07,.4,palette.mint);else cylinder(x,.2,z,.3,.1,palette.yellow);label(amount(Number(v)),x,.27,z,.6);idx++;}}
        label(amount(moneyValue(r.tray)),1,.13,2.2,2.3);
      } else if(course.kind==='compare'||course.kind==='quantity') {
        box(-2.5,.01,0,4,.04,4.6,0xdcedee);box(2.1,.01,0,4,.04,4.6,0xf4dfcd);
        const operated=course.kind==='quantity'&&r.phase,sub=a.relation==='decrease';
        const left=operated?(sub?r.a-r.b:r.a+r.b):r.a,right=operated?(sub?r.b:0):r.b;
        counters(left,-3.8,-1.5,palette.blue);counters(right,.7,-1.5,palette.coral);
        label(left,-2.5,.12,2.25,1.1);label(right,2.1,.12,2.25,1.1);
        label(course.kind==='compare'?(r.a>r.b?'>':r.a<r.b?'<':'='):(r.layout?Math.abs(r.a-r.b):r.a+r.b),-.2,.25,-2.3,1.3);
        if(course.kind==='quantity'&&r.layout){for(let i=0;i<Math.min(r.a,r.b,10);i++)box(-.3,.04,-1.5+i*.29,.9,.04,.035,palette.mint);}
      } else {
        if(course.kind==='count') {
          bank(r.tens,r.ones,-4,-.5,palette.blue);
          hundredChart(valueOf(r));
          label(valueOf(r),2.2,.2,2.7,2.2);
        } else {
          bank(r.tens,r.ones,-4,-.4,palette.blue);
          if(r.phase===0)bank(Math.floor(r.b/10),r.b%10,.5,-.4,palette.coral);
          else label(valueOf(r),2.2,.15,0,3);
          animated.push(train(2,-2,palette.coral));
          if(course.kind==='column') { label(`${r.a} ${a.op} ${r.b}`,2,.2,2.5,3); }
        }
        // A real number line, with equal spacing for each integer (0 to 100).
        box(0,.04,-2.75,9.4,.06,.07,palette.edge);
        for(let n=0;n<=100;n+=10)box(-4.7+n*.094,.1,-2.75,.025,.1,.24,palette.edge);
        const dot=ball(-4.7+valueOf(r)*.094,.22,-2.75,.14,palette.coral);animated.push(dot);
      }
    } else {
      if(course.kind==='character') {
        const v=a.variants[r.variant];
        box(0,.03,0,5,.13,3.5,palette.blue);
        if(r.assembled){box(0,.35,0,2.8,.55,2.8,palette.wood);label(v.char,0,.64,0,2.4);}
        else {box(-1.4,.32,0,2,.5,2.5,palette.wood);box(1.1,.32,0,2,.5,2.5,palette.wood);label(a.base,-1.4,.59,0,1.7);label(v.part,1.1,.59,0,1.7);}
        animated.push(prop(v.object,-3.9,-1.8,.7));
        prop('tree',4,-1.9,.7);
      } else if(course.kind==='writing') {
        box(0,.06,0,4.6,.15,4.6,palette.cream);cylinder(3.7,.2,0,.5,.35,palette.dark);
        const brush=box(3,.35,0,.13,.13,3,palette.edge);brush.rotation.y=-.3;
        box(-3.5,.07,0,.6,.14,3.5,palette.purple);
      } else if(course.kind==='dictionary') {
        box(-1.5,.18,0,3,.25,4.5,palette.cream);box(1.5,.18,0,3,.25,4.5,palette.cream);box(0,.12,0,.12,.35,4.6,palette.edge);
        label(r.initial||'ABC',-1.5,.33,-1,2.4);label(r.syllable||'a b c',-1.5,.33,1,2.4);label(r.entry||'字',1.5,.33,0,2.4);
        for(let i=0;i<6;i++)box(-4+i*.24,.55,-2.7,.2,1,.8,[palette.blue,palette.coral,palette.mint][i%3]);
      } else {
        box(0,.04,0,9,.1,5,palette.mint);
        prop('tree',-3.7,-1.7,.75);prop('tree',3.9,-1.8,.65);
        let object=a.object||a.variants?.[r.variant]?.object||'person';
        if(course.kind==='sentence'){const who=a.who[r.slots[0]??0];object=who.includes('鸭')?'duck':who.includes('蛙')?'frog':who.includes('鸡')?'chick':who.includes('蜻蜓')?'dragonfly':'person';}
        if(course.kind==='poetry'&&a.title.zh==='画鸡')object='rooster';
        if(course.kind==='word'&&a.variants[r.variant].word==='踢毽子')object='shuttlecock';
        if(['boat','lotus','frog','duck','water','moon'].includes(object)) {
          const pond=ball(0,.14,0,2.1,palette.blue,objects,1.6,.025,1);pond.material=mat(palette.blue,.25);prop('leaf',1,.1,.5);
        }
        const x=course.kind==='word'&&!r.placed?-3:course.kind==='poetry'?-2+r.line:0;
        const actor=prop(object,x,.15,1.25);animated.push(actor);
        if(course.kind==='sentence'){const where=a.where[r.slots[1]??0];if(/家|学校/.test(where)){box(-2.5,.7,-1,1.7,1.4,1.5,palette.cream);box(-2.5,1.5,-1,2,.2,1.8,palette.coral);}if(/河|池塘/.test(where))ball(1,.13,.6,1.6,palette.blue,objects,1.5,.03,1);if(a.who[r.slots[0]??0]==='我们')prop('person',-1.4,.15,1);if(/北京|天安门/.test(where)){box(0,1,-1.7,4,1.2,1,palette.coral);box(0,1.75,-1.7,4.5,.3,1.4,palette.yellow);label(where,0,1.91,-1.7,2);}const verb=a.actions[r.slots[2]??0];if(/月亮|星星/.test(verb))prop('moon',2,-1,1);if(/读书|书包/.test(verb))prop('book',1,1,.8);actor.userData.motion=verb;actor.userData.active=r.played;}
        if(course.kind==='word'){actor.userData.motion=a.variants[r.variant].verb;actor.userData.active=r.moved>0&&r.placed;if(a.variants[r.variant].word==='方')actor.rotation.y=Math.PI/4;
          if(a.variants[r.variant].word==='春雨'&&r.placed){actor.visible=false;const cloud=prop('cloud',0,-.5,1.8);cloud.position.y=2;for(let i=0;i<9;i++){const drop=ball((i%3-1)*.7,.3+Math.floor(i/3)*.5,(i%2)*.5,.09,palette.blue);drop.userData.rain=true;drop.userData.base=drop.position.clone();animated.push(drop);}}
        }
        if(course.kind==='poetry'){
          actor.userData.active=true;actor.userData.motion=object==='boat'?'游':'摇';prop('cloud',-1.8-r.line*.2,-2,.7);
          if(a.title.zh==='小池'){prop('leaf',1,1,.4+r.line*.1);if(r.line>=3)prop('dragonfly',1,1,.8);}
          else if(a.title.zh==='池上'){for(let i=0;i<7;i++)if(Math.abs(i-3)>r.line/2)prop('leaf',-3+i,1,.35);prop('white-lotus',2.8,1.1,.55);}
          else if(a.title.zh==='春晓'){for(let i=0;i<r.line;i++)prop('flower',-2+i*1.4,1.8,.35);}
          else if(a.object==='moon'){prop('person',-2,1,.8);box(-2,.15,.2,2,.35,1.8,palette.cream);if(a.title.zh==='再看月光'){const lightPatch=box(.5,.105,1.5,3,.02,1.2,0xc5def1);lightPatch.rotation.y=r.line*Math.PI/8;const window=box(2,1.1,-1.2,.1,2,1.8,palette.cream);void window;actor.position.set(3,.1,-2+r.line*.3);}}
          else if(a.title.zh==='赠汪伦')prop('person',-3,1.2,.8);
        }
        if(course.kind==='speaking'){const listener=prop('person',r.played?2-r.included.length*.45:3,1,.8);animated.push(listener);listener.userData.active=r.played;listener.userData.motion=r.included.includes(1)?'走':'摇';}
        if(course.kind==='story'){prop('book',-2,1,.8);r.order.forEach((n,i)=>{const marker=cylinder(-2+i*2,.16,1.8,.35,.2,[palette.blue,palette.coral,palette.yellow][n]);label(i+1,-2+i*2,.27,1.8,.4);marker.userData.sequence=i;animated.push(marker);});actor.userData.active=r.played;actor.userData.motion='走';}
        actor.userData.base=actor.position.clone();
      }
    }
    for(const o of animated) o.userData.base??=o.position.clone();pulse=1; render();
  }
  const ray=new THREE.Raycaster(), pointer=new THREE.Vector2(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.4);
  function hitPoint(e){const b=canvas.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);const v=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,v))return null;return world.worldToLocal(v);}
  canvas.addEventListener('pointerdown',e=>{
    if(drag)return;onGesture();const p=hitPoint(e);const hits=ray.intersectObjects(shapes);
    const nearest=p&&shapes.map(item=>({item,d:Math.hypot((item.position.x-p.x)/.9,(item.position.z-p.z)/1.3)})).sort((a,b)=>a.d-b.d)[0];
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,item:hits[0]?.object||(nearest?.d<1?nearest.item:null),point:p};
    canvas.dataset.dragging=drag.item?String(drag.item.userData.piece):'view';
    if(drag.item){drag.offset=drag.item.position.clone().sub(p);drag.item.position.y=.7;drag.item.material.emissive.setHex(0x444422);}
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.item){const p=hitPoint(e);if(p){drag.item.position.x=p.x+drag.offset.x;drag.item.position.z=p.z+drag.offset.z;}}
    else {yaw=Math.max(-.3,Math.min(.3,yaw+(e.clientX-drag.lastX)*.003));world.rotation.y=yaw;}
    drag.lastX=e.clientX;render();
  });
  function finish(e,cancelled=false){
    if(!drag||drag.id!==e.pointerId)return;
    const d=drag;drag=null;
    delete canvas.dataset.dragging;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(d.item){const {x,z}=d.item.position,index=d.item.userData.piece;d.item.material.emissive.setHex(0);if(cancelled)update(activity,room);else onDrop(index,x,z);}
    else if(!cancelled&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<8)onActivate();
    render();
  }
  canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
  function theme(){const dark=document.documentElement.dataset.theme==='dark';scene.background=new THREE.Color(dark?0x202a39:0xeee8da);sun.intensity=dark?1.6:2.2;render();}
  function resize(){const w=innerWidth,h=innerHeight;if(w===lastW&&h===lastH)return;lastW=w;lastH=h;renderer.setSize(w,h,false);const width=w<=760?12:18;camera.left=-width/2;camera.right=width/2;camera.top=width*h/w/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();world.position.set(w<=760?0:-2.1,0,w<=760?-.5:0);render();}
  let disposed=false;
  function render(){if(!disposed)renderer.render(scene,camera);}
  let raf;
  function tick(now){raf=requestAnimationFrame(tick);if(document.hidden)return;const tweening=shapes.some(o=>o!==drag?.item&&o.position.distanceTo(o.userData.target)>.005);canvas.dataset.settled=String(!tweening);if(tweening)for(const o of shapes)if(o!==drag?.item)o.position.lerp(o.userData.target,.3);const moving=pulse>0;if(moving){pulse=Math.max(0,pulse-.025);for(const o of animated){const b=o.userData.base,m=o.userData.motion||"";if(o.userData.rain&&b)o.position.y=(b.y+(pulse*3))%1.8;o.rotation.y=Math.sin(now*.005)*pulse*.13;if(o.userData.active&&b){const wave=Math.sin((1-pulse)*Math.PI*2);if(/跳|蹲|飞|升/.test(m))o.position.y=b.y+Math.abs(wave)*.7;else if(/转|滚/.test(m))o.rotation.z=wave*.6;else if(/游|走|钻|踢/.test(m))o.position.x=b.x+wave*.8;else o.rotation.z=wave*.12;}}}if(moving||drag||tweening)render();clock=now;}
  void clock;
  raf=requestAnimationFrame(tick);addEventListener('resize',resize);theme();resize();
  return {update,theme,cancelDrag(){if(drag)finish({pointerId:drag.id},true);},storyFrame(i){for(const o of animated){if(o.userData.sequence!==undefined)o.position.y=o.userData.sequence===i?.5:.16;else if(o.userData.base)o.position.x=-2+i*2;}pulse=.8;render();},flash(){pulse=1;},dispose(){disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);clear();for(const m of materials.values())m.dispose();for(const g of geometries.values())g.dispose();env.dispose();renderer.dispose();}};
}
