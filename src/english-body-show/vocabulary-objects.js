import * as THREE from 'three';
import * as kit from './objects.js';
const {ball,tube,cone,rounded,ring,material,canvasTexture}=kit;
const at=(group,mesh,x=0,y=0,z=0)=>{mesh.position.set(x,y,z);group.add(mesh);return mesh;};
const mat=(color)=>material(color,{roughness:.62});
const oldAnimals=new Set('cat dog rabbit duck bird fish cow elephant'.split(' '));
const oldFruits=new Set('apple banana orange pear grape strawberry watermelon pineapple'.split(' '));
const oldSchool=new Set('bag book pen pencil ruler eraser crayon pencil-case'.split(' '));
export const VISUALS={color:'red yellow blue green orange purple black white pink brown gray'.split(' '),fruit:[...oldFruits,'peach','cherry','lemon','mango','kiwi','coconut','plum','blueberry'],animal:[...oldAnimals,'lion','tiger','bear','panda','monkey','giraffe','zebra','horse','pig','sheep','goat','turtle'],number:'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' '),body:'head eye ear nose mouth hand arm foot face hair neck shoulder leg knee finger toe'.split(' '),school:[...oldSchool,'notebook','marker','glue','scissors','sharpener','folder','paper','paintbrush']};

function fruit(id) {
  if(id==='strawberry'){
    const g=new THREE.Group(),red=mat('#ce2543'),green=mat('#348a42');
    const profile=[[0,0],[.018,.01],[.065,.06],[.098,.14],[.09,.21],[.065,.25],[0,.263]].map(([x,y])=>new THREE.Vector2(x,y));
    at(g,new THREE.Mesh(new THREE.LatheGeometry(profile,36),red));
    for(let row=0;row<5;row++)for(let i=0;i<10;i++){
      const a=(i+(row%2)*.5)*Math.PI/5,y=.045+row*.038,r=[.045,.072,.092,.097,.082][row];
      const seed=at(g,ball(.0045,mat('#f4d99c'),[1,1.6,.7],10),Math.sin(a)*r,y,Math.cos(a)*r);seed.rotation.y=a;
    }
    for(let i=0;i<6;i++){const a=i*Math.PI/3,leaf=at(g,ball(.055,green,[1,.12,.36],16),Math.sin(a)*.04,.26,Math.cos(a)*.04);leaf.rotation.y=a+Math.PI/2;leaf.rotation.z=.15;}
    at(g,tube(.007,.009,.045,green,10),0,.284,0);return g;
  }
  if(oldFruits.has(id))return kit.createFruit(id);
  const g=new THREE.Group(),stem=mat('#705038'),leaf=mat('#3f8d47');
  const colors={peach:'#f5a080',cherry:'#ac163a',lemon:'#f4d632',mango:'#ffb130',kiwi:'#8d653c',coconut:'#7b5037',plum:'#694179',blueberry:'#454b96'};
  const m=mat(colors[id]);
  const body=at(g,ball(.14,m,id==='lemon'?[1.2,.8,.8]:id==='mango'?[.8,1.25,.8]:[1,1,1]),0,.15,0);
  if(id==='peach') {at(g,ball(.107,m,[.85,1.18,1]),-.055,.15,.002);at(g,ball(.107,m,[.85,1.18,1]),.055,.15,.002);}
  if(id==='cherry') {const stalk=at(g,tube(.006,.008,.17,stem,10),.025,.35,0);stalk.rotation.z=-.28;}
  else if(id!=='kiwi'&&id!=='coconut'&&id!=='blueberry') {at(g,tube(.008,.01,.055,stem,10),0,.315,0);const l=at(g,ball(.052,leaf,[1,.17,.5]),.05,.32,0);l.rotation.z=.3;}
  if(id==='blueberry') {const crown=at(g,cone(.045,.018,mat('#243755'),5),0,.29,0);crown.rotation.x=Math.PI;}
  if(id==='lemon') {at(g,ball(.03,m),-.164,.15,0);at(g,ball(.03,m),.164,.15,0);}
  if(id==='kiwi'||id==='coconut') {
    // A cut face plus rind makes these two fruits distinguishable at thumbnail size.
    const face=canvasTexture(256,256,(ctx,w,h)=>{
      ctx.fillStyle=id==='kiwi'?'#8bbd42':'#fff6e6';ctx.fillRect(0,0,w,h);
      ctx.fillStyle=id==='kiwi'?'#f5e6b5':'#cab694';ctx.beginPath();ctx.ellipse(128,128,id==='kiwi'?27:55,id==='kiwi'?35:55,0,0,Math.PI*2);ctx.fill();
      if(id==='kiwi'){ctx.fillStyle='#292b23';for(let i=0;i<24;i++){const a=i*Math.PI/12;ctx.beginPath();ctx.ellipse(128+66*Math.cos(a),128+66*Math.sin(a),3,7,a,0,Math.PI*2);ctx.fill();}}
    });
    at(g,new THREE.Mesh(new THREE.CircleGeometry(.124,48),new THREE.MeshStandardMaterial({map:face,roughness:.75})),0,.16,.137);
  }
  body.castShadow=true;return g;
}

function animal(id) {
  if(oldAnimals.has(id))return kit.createAnimal(id);
  const g=new THREE.Group();
  const palette={lion:'#d59a45',tiger:'#e89436',bear:'#946647',panda:'#f8f2e5',monkey:'#ae7c53',giraffe:'#ecc05c',zebra:'#eee9dd',horse:'#a46b45',pig:'#f3a9b4',sheep:'#eee5d6',goat:'#c4b49b',turtle:'#629455'};
  const fur=mat(palette[id]),dark=mat('#302b32'),cream=mat('#eed6ad');
  if(id==='turtle'){
    const shell=at(g,ball(.18,mat('#53784a'),[1,.55,1.15]),0,.14,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;at(g,ball(.04,mat('#92ae64'),[1,.15,1]),Math.cos(a)*.1,.229,Math.sin(a)*.1);}
    const head=at(g,ball(.062,fur),.2,.11,0);
    for(const x of [-.1,.1])for(const z of [-.14,.14])at(g,ball(.052,fur,[1.3,.45,.7]),x,.04,z);
    for(const z of [-.035,.035])at(g,ball(.008,dark),.24,.14,z);
    g.userData.anim=t=>{head.position.x=.2+Math.sin(t*2)*.01;shell.rotation.z=Math.sin(t)*.015;};return g;
  }
  if(id==='horse'||id==='zebra'){
    at(g,ball(.16,fur,[1.3,.8,.7]),0,.29,0);
    for(const x of [-.14,.14])for(const z of [-.07,.07]){
      at(g,tube(.02,.024,.27,fur,16),x,.145,z);at(g,rounded(.06,.043,.063,.014,dark),x,.025,z);
    }
    const neck=at(g,tube(.046,.075,.25,fur),.15,.43,0);neck.rotation.z=-.32;
    at(g,ball(.083,fur,[.9,1.1,.78]),.21,.58,0);
    const muzzle=at(g,rounded(.16,.075,.095,.034,fur),.285,.52,0);muzzle.rotation.z=-.3;
    for(const sign of [-1,1]){
      at(g,ball(.011,dark),.238,.595,sign*.063);at(g,ball(.008,dark),.342,.515,sign*.042);
      const ear=at(g,cone(.025,.095,fur,16),.195,.685,sign*.04);ear.rotation.z=.1;
    }
    const mane=at(g,rounded(.035,.26,.052,.018,dark),.094,.45,0);mane.rotation.z=-.32;
    const forelock=at(g,rounded(.045,.12,.065,.016,dark),.155,.63,0);forelock.rotation.z=-.25;
    const tail=at(g,cone(.027,.24,dark),-.225,.24,0);tail.rotation.z=-.25;
    if(id==='zebra')for(const sign of [-1,1]){
      for(let i=0;i<8;i++){const stripe=at(g,rounded(.017,.14,.006,.003,dark),-.155+i*.043,.3,sign*.104);stripe.rotation.z=i%2?.18:-.2;}
      for(let i=0;i<4;i++){const stripe=at(g,rounded(.09,.016,.006,.003,dark),.15+i*.013,.4+i*.044,sign*.055);stripe.rotation.z=-.32;}
    }
    g.userData.anim=t=>{tail.rotation.z=-.25+Math.sin(t*3)*.14;};return g;
  }
  const tall=id==='giraffe',sit=['bear','panda','monkey'].includes(id);
  at(g,ball(.15,fur,sit?[.85,1.2,.8]:[1.3,.85,.7]),0,sit?.2:.21,0);
  const headX=sit?0:.18,headY=tall?.68:sit?.45:.36;
  if(tall) {const neck=at(g,tube(.04,.065,.4,fur),.15,.43,0);neck.rotation.z=-.12;}
  if(id==='lion') at(g,ball(.147,mat('#88512a'),[1,1,.45]),headX,headY,-.05);
  const head=at(g,ball(.1,fur,id==='horse'?[1.25,1,.8]:[1,1,.85]),headX,headY,0);
  const snout=at(g,ball(id==='pig'?.055:.04,id==='pig'?mat('#d87d93'):cream,[1.2,.7,.6]),headX,headY-.034,.086);
  if(id==='pig')for(const x of [-.018,.018])at(g,ball(.009,dark,[.65,1,.4]),headX+x,headY-.029,.12);
  else at(g,ball(.012,dark,[1,.8,.55]),headX,headY-.02,.117);
  for(const sign of [-1,1]){
    const earMaterial=['panda','zebra'].includes(id)?dark:fur;
    const ear=at(g,ball(.036,earMaterial,[.8,1,.5]),headX+sign*.075,headY+.09,0);
    if(['horse','goat','giraffe'].includes(id)){ear.scale.y*=1.65;ear.rotation.z=-sign*.3;}
    if(id==='panda')at(g,ball(.033,dark,[1,.9,.3]),headX+sign*.043,headY+.014,.078);
    at(g,ball(.012,id==='panda'?mat('#fffdf7'):dark,[1,1,.6]),headX+sign*.041,headY+.02,id==='panda'?.091:.082);
    if(id==='panda')at(g,ball(.007,dark),headX+sign*.04,headY+.02,.1);
  }
  for(const x of [-.115,.115])for(const z of [-.064,.064]){
    const legMat=id==='panda'?dark:fur;
    at(g,tube(.028,.033,.16,legMat,14),x,.085,z);
    at(g,rounded(.065,.04,.074,.016,['pig','goat','horse','zebra','giraffe'].includes(id)?dark:legMat),x,.024,z+.005);
  }
  if(id==='sheep')for(let i=0;i<18;i++){const a=i*2.4;at(g,ball(.062,mat('#f8f1e4')),Math.cos(a)*.14,.22+Math.sin(i*1.8)*.06,Math.sin(a)*.083);}
  if(id==='goat'){
    for(const sign of [-1,1]){const horn=at(g,cone(.025,.12,cream),headX+sign*.052,headY+.14,0);horn.rotation.z=-sign*.2;}
    at(g,cone(.026,.08,cream),headX,headY-.12,.075).rotation.z=Math.PI;
  }
  if(tall){for(const sign of [-1,1]){at(g,tube(.01,.012,.065,fur,10),headX+sign*.045,headY+.125,0);at(g,ball(.017,dark),headX+sign*.045,headY+.16,0);}}
  if(['tiger','zebra','giraffe'].includes(id)){
    const patch=mat(id==='giraffe'?'#ab713c':'#34313a');
    for(let i=0;i<8;i++){const x=-.15+i*.045;const spot=at(g,rounded(id==='giraffe'?.041:.019,.095,.007,.005,patch),x,.24+(i%2)*.025,.095);spot.rotation.z=i%2?.3:-.2;}
    if(tall)for(let i=0;i<5;i++)at(g,ball(.018,patch,[1,1,.2]),.16,.34+i*.055,.046);
  }
  if(id==='horse'||id==='zebra') {at(g,rounded(.11,.12,.032,.014,dark),headX-.07,headY+.04,-.002);}
  if(id==='monkey'){at(g,ball(.07,cream,[.85,1,.28]),headX,headY,.075);for(const s of [-1,1])at(g,ball(.01,dark),headX+s*.032,headY+.015,.096);}
  const tail=at(g,ring(.09,.013,fur,Math.PI*1.25),-.2,.21,0);tail.rotation.y=Math.PI/2;
  if(['bear','panda'].includes(id))tail.scale.setScalar(.22);
  if(id==='lion')at(g,ball(.03,mat('#88512a')),-.27,.14,0);
  g.userData.anim=t=>{tail.rotation.z=Math.sin(t*3)*.2;head.rotation.z=Math.sin(t*1.5)*.035;snout.scale.y=1+Math.sin(t*2)*.02;};return g;
}

function school(id) {
  if(oldSchool.has(id))return kit.createSchoolItem(id);
  const g=new THREE.Group(),blue=mat('#589acc'),red=mat('#df6a73'),silver=material('#bdc8d3',{metalness:.7,roughness:.27}),paper=mat('#fffaf0');
  if(['notebook','folder','paper'].includes(id)){
    at(g,rounded(.23,.32,.023,.009,id==='folder'?mat('#efc35c'):paper),0,.17,0);
    if(id==='folder')at(g,rounded(.09,.06,.025,.009,mat('#efc35c')),-.055,.34,0);
    if(id==='notebook'){
      at(g,rounded(.025,.33,.035,.008,red),-.125,.17,0);
      for(let i=0;i<6;i++){const r=at(g,ring(.018,.004,silver),-.112,.04+i*.048,.025);r.rotation.x=Math.PI/2;}
      for(let i=0;i<6;i++)at(g,rounded(.15,.002,.001,.001,mat('#adc7d8')),.015,.07+i*.035,.013);
    }
  }else if(id==='scissors'){
    for(const s of [-1,1]){
      const half=new THREE.Group();half.rotation.z=s*.3;g.add(half);
      at(half,ring(.048,.012,s>0?blue:red),s*.055,.05,0);
      at(half,rounded(.035,.24,.016,.008,silver),0,.22,0);
    }
    at(g,ball(.017,silver,[1,1,.5]),0,.12,.013);
  }else if(id==='glue'){
    at(g,rounded(.15,.21,.075,.028,paper),0,.12,0);
    at(g,rounded(.11,.065,.004,.006,blue),0,.13,.04);
    at(g,cone(.025,.1,red),0,.275,0);
  }else if(id==='sharpener'){
    at(g,rounded(.17,.1,.12,.02,blue),0,.06,0);
    at(g,rounded(.04,.006,.09,.003,silver),0,.114,0);
    at(g,ball(.015,mat('#2f3646'),[1,1,.2]),0,.057,.062);
    at(g,ball(.008,silver),0,.12,0);
  }else if(id==='marker'){
    at(g,tube(.035,.035,.27,paper),0,.16,0);at(g,tube(.038,.038,.09,blue),0,.33,0);at(g,tube(.037,.037,.05,blue),0,.027,0);
  }else if(id==='paintbrush'){
    at(g,tube(.012,.02,.27,red),0,.14,0);at(g,tube(.025,.018,.07,silver),0,.31,0);at(g,cone(.029,.1,mat('#845632')),0,.395,0);
  }
  return g;
}

function number(value) {
  const g=new THREE.Group();
  const plaque=kit.rounded(1.15,.09,.86,.045,mat('#e8dbc3'));g.add(plaque);
  for(let i=0;i<value;i++)at(g,rounded(.14,.14,.14,.023,mat(i<10?'#de9a45':'#58a9a3')),(i%5-2)*.2,.13,Math.floor(i/5)*.19-.3);
  const texture=canvasTexture(256,128,(c)=>{c.fillStyle='#fffaf0';c.fillRect(0,0,256,128);c.fillStyle='#29344c';c.font='bold 95px sans-serif';c.textAlign='center';c.fillText(String(value),128,101);});
  const sign=at(g,new THREE.Mesh(new THREE.PlaneGeometry(.53,.265),new THREE.MeshStandardMaterial({map:texture,roughness:.8})),0,.41,-.37);sign.rotation.x=-.12;
  return g;
}

function body(id) {
  const g=kit.createKid(),skin=mat('#f6c9a8'),parts=g.userData.parts,limbs=g.userData.limbs;
  const head=limbs.head;
  head.position.y+=.1;g.children[1].position.y=.78;g.children[1].scale.y=2.2;
  parts.face={nodes:[head.children[2]]};parts.hair={nodes:[head.children[1]]};parts.neck={nodes:[g.children[1]]};
  parts.shoulder={nodes:[at(g,ball(.06,mat('#4aa3df')), .18,.66,.03)]};
  parts.leg={nodes:[limbs.legs[0].group]};
  parts.knee={nodes:[at(limbs.legs[0].group,ball(.05,mat('#3d4468'),[1,.7,.6]),0,-.14,.051)]};
  const fingers=[];
  for(const hand of parts.hand.nodes){for(let i=0;i<4;i++)fingers.push(at(hand,rounded(.018,.06,.018,.008,skin),-.033+i*.022,-.064,.008));}
  parts.finger={nodes:[fingers[1]]};
  const toes=[];
  for(const {foot} of limbs.legs){foot.children[0].material=skin;for(let i=0;i<5;i++)toes.push(at(foot,ball(.012-i*.001,skin,[.8,1,1.5]),-.042+i*.021,-.03,.14));}
  parts.toe={nodes:[toes[1]]};
  // One side and one specific member, instead of highlighting both eyes / hands.
  const nodes=parts[id]?.nodes?.slice(0,1);if(!nodes?.length)throw new Error(`No body visual: ${id}`);
  g.updateMatrixWorld(true);
  const box=new THREE.Box3();nodes.forEach(n=>box.expandByObject(n));
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  if(id==='hair')center.y+=.075;
  const radius=Math.max(['finger','toe'].includes(id)?.018:.045,Math.min(.19,Math.max(size.x,size.y)*.56));
  const focus=at(g,new THREE.Mesh(new THREE.RingGeometry(radius,radius+.014,48),new THREE.MeshBasicMaterial({color:'#b52968',side:THREE.DoubleSide,depthTest:false})),center.x,center.y,Math.max(box.max.z+.035,.2));focus.renderOrder=5;
  const arrow=at(g,new THREE.Mesh(new THREE.ConeGeometry(.035,.1,3),new THREE.MeshBasicMaterial({color:'#b52968',depthTest:false})),center.x+radius+.09,center.y,focus.position.z);arrow.rotation.z=Math.PI/2;arrow.renderOrder=5;
  g.userData.focus={center:center.toArray(),span:Math.max(['finger','toe'].includes(id)?.20:.34,radius*4.2)};
  if(id==='hair')focus.scale.y=.48;
  g.userData.anim=t=>{const pulse=1+Math.sin(t*3)*.035;focus.scale.set(pulse,id==='hair'?.48*pulse:pulse,1);};
  g.userData.reward=t=>{
    const pulse=Math.sin(t*Math.PI*2);
    if(['head','face','hair','neck'].includes(id))head.rotation.z=pulse*.12;
    else if(id==='eye')limbs.eyeParts[0].group.scale.y=Math.max(.1,1-Math.abs(pulse));
    else if(id==='ear')limbs.ears[0].group.rotation.y=pulse*.35;
    else if(id==='mouth')limbs.mouth.scale.y=1+Math.abs(pulse)*.6;
    else if(id==='nose')parts.nose.nodes[0].scale.setScalar(1+Math.abs(pulse)*.1);
    else if(['hand','arm','finger','shoulder'].includes(id))limbs.arms[0].group.rotation.z=.14-Math.abs(pulse)*.8;
    else limbs.legs[0].group.rotation.x=pulse*.3;
  };return g;
}

export function createWordModel(course,item) {
  if(!item || !VISUALS[course.kind]?.includes(item.visual))throw new RangeError(`Missing visual: ${course.kind}/${item?.visual}`);
  if(course.kind==='color') {const g=kit.createCar();kit.paintGroup(g,item.color);return g;}
  if(course.kind==='fruit')return fruit(item.id);
  if(course.kind==='animal')return animal(item.id);
  if(course.kind==='school')return school(item.id);
  if(course.kind==='number')return number(item.value);
  return body(item.id);
}
