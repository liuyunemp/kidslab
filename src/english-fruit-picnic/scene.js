import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createWordModel } from './vocabulary-objects.js';
import * as kit from './objects.js';

export function createEnglishStage({canvas,course}) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch{return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.01,80);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.04);
  scene.environment=environment.texture;
  const hemisphere=new THREE.HemisphereLight('#fff9ed','#8876a5',1.25);scene.add(hemisphere);
  const key=new THREE.DirectionalLight('#fff5e3',3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.001;scene.add(key);
  const fill=new THREE.DirectionalLight('#d1e9ff',1.2);fill.position.set(4,3,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.14,80),kit.material('#eddfc5',{roughness:.9}));floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);
  const stage=new THREE.Group();scene.add(stage);
  const pedestal=kit.rounded(4.9,.16,2.5,.07,kit.material('#f9eed9'));pedestal.position.y=-.05;pedestal.receiveShadow=true;stage.add(pedestal);
  const objects=new THREE.Group();stage.add(objects);
  const decor=new THREE.Group();stage.add(decor);
  if(course.kind==='fruit'){const basket=kit.createBasket();basket.scale.setScalar(1.35);basket.position.set(0,.04,-.55);decor.add(basket);}
  if(course.kind==='school'){const bag=kit.createSchoolItem('bag');bag.scale.setScalar(1.8);bag.position.set(1.5,.05,-.45);decor.add(bag);}
  if(course.kind==='animal'){for(const x of [-2,2]){const tree=kit.createTree();tree.position.set(x,.04,-.7);decor.add(tree);}const fence=kit.createFence(3);fence.position.set(0,.03,-.85);decor.add(fence);}
  if(course.kind==='number'){const train=kit.createTrain();train.scale.setScalar(.65);train.position.set(0,.05,-.5);decor.add(train);}
  const thumbs=new Map(),nodes=[];
  let lastKey='',lastState=null,rewardAt=0,width=0,height=0,free={x:0,y:140,w:innerWidth,h:innerHeight-450};
  function dispose(root) {root.traverse(n=>{n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){m.map?.dispose();m.dispose();}});}
  function fitModel(model,max=1.2) {
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const scale=max/Math.max(size.x,size.y,size.z,.01);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    return model;
  }
  function thumbnail(id) {
    if(thumbs.has(id))return thumbs.get(id);
    const item=course.items.find(w=>w.id===id),model=createWordModel(course,item),snapshot=new THREE.Scene();snapshot.background=new THREE.Color('#fff8e9');snapshot.environment=environment.texture;
    snapshot.environmentIntensity=.3;
    snapshot.add(new THREE.HemisphereLight('#fff9ee','#a7a6bd',.7));const light=new THREE.DirectionalLight('#ffffff',1.4);light.position.set(-2,4,5);snapshot.add(light);snapshot.add(model);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const focus=course.kind==='body'?model.userData.focus:null;
    if(focus)center.fromArray(focus.center);
    const span=focus?.span??Math.max(size.x,size.y,size.z)*1.35;
    const cam=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,30);
    cam.position.copy(center).add(new THREE.Vector3(course.kind==='body'?0:span*.7,course.kind==='number'?span*3:course.kind==='school'&&id==='ruler'?span*2:course.kind==='body'?0:span*.6,span*3));cam.lookAt(center);
    const target=new THREE.WebGLRenderTarget(240,240);target.texture.colorSpace=THREE.SRGBColorSpace;
    renderer.setRenderTarget(target);renderer.render(snapshot,cam);
    const pixels=new Uint8Array(240*240*4);renderer.readRenderTargetPixels(target,0,0,240,240,pixels);renderer.setRenderTarget(null);
    const cv=document.createElement('canvas');cv.width=cv.height=240;const ctx=cv.getContext('2d'),data=ctx.createImageData(240,240);
    for(let y=0;y<240;y++)data.data.set(pixels.subarray((239-y)*960,(240-y)*960),y*960);
    ctx.putImageData(data,0,0);const url=cv.toDataURL('image/png');thumbs.set(id,url);target.dispose();dispose(model);return url;
  }
  function refreshView() {
    const panel=document.getElementById('panel')?.getBoundingClientRect();
    const top=document.getElementById('journey')?.getBoundingClientRect().bottom??138;
    if(innerWidth>860)free={x:24,y:top+10,w:Math.max(200,(panel?.left??innerWidth-370)-48),h:Math.max(150,innerHeight-top-40)};
    else free={x:8,y:top+6,w:innerWidth-16,h:Math.max(110,(panel?.top??innerHeight-310)-top-14)};
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height);}
    camera.aspect=width/height;
    const tan=Math.tan(THREE.MathUtils.degToRad(19)),distance=Math.max(4.9*height/free.w,2.2*height/free.h)/(2*tan);
    camera.position.set(0,distance*.24,distance);camera.lookAt(0,.58,0);
    camera.setViewOffset(width,height,width/2-(free.x+free.w/2),height/2-(free.y+free.h/2),width,height);camera.updateProjectionMatrix();
  }
  function update(state) {
    lastState=state;stage.visible=!state.paused;
    let ids;
    if(state.phase==='learn')ids=[state.batch[state.learnIndex]];
    else if(state.phase==='answer'&&state.question?.mode!=='picture')ids=state.question.options;
    else ids=[state.question?.target??state.batch[0]];
    const token=ids.join('|')+state.phase;
    if(token!==lastKey){
      lastKey=token;decor.position.x=0;for(const n of [...objects.children]){objects.remove(n);dispose(n);}nodes.length=0;
      ids.forEach((id,i)=>{const holder=new THREE.Group(),model=fitModel(createWordModel(course,course.items.find(w=>w.id===id)),ids.length===1?1.6:1.05);holder.add(model);holder.position.set((i-(ids.length-1)/2)*1.14,.11,ids.length===1?.15:.5);objects.add(holder);nodes.push({holder,model,x:holder.position.x});});
      if(state.phase==='feedback'&&state.result==='correct')rewardAt=performance.now();else rewardAt=0;
    }
    decor.visible=(state.phase!=='answer'||state.question?.mode==='picture')&&!(course.kind==='school'&&ids.length===1&&ids[0]==='bag');
    refreshView();
  }
  function applyTheme(){const dark=document.documentElement.dataset.theme==='dark';scene.background=new THREE.Color(dark?'#211e39':'#faefd9');floor.material.color.set(dark?'#39314e':'#eddfc5');pedestal.material.color.set(dark?'#57445a':'#fff3d9');}
  function measureFrame(){return {free,canvas:{w:width,h:height},visible:stage.visible,wordCount:nodes.length};}
  let raf=0;
  function loop(now){
    raf=requestAnimationFrame(loop);if(document.hidden)return;
    nodes.forEach(({holder,model,x},i)=>{
      holder.position.y=.11+Math.sin(now*.0015+i)*.016;holder.rotation.y=Math.sin(now*.0007+i)*.045;model.userData.anim?.(now*.001);
      if(rewardAt){
        const t=Math.min(1,(now-rewardAt)/1200);holder.position.y+=Math.sin(t*Math.PI)*.35;
        if(course.kind==='number')decor.position.x=t*.85;
        else if(course.kind==='fruit'){holder.position.z=.15-t*.7;holder.scale.setScalar(1-t*.65);holder.position.y+=t*.18;}
        else if(course.kind==='school'&&lastState.question.target!=='bag'){holder.position.set(x+t*1.5,.11+Math.sin(t*Math.PI)*.6+t*.3,.15-t*.6);holder.scale.setScalar(1-t*.78);}
        else if(course.kind==='animal')holder.position.z=.15-t*.3;
        model.userData.reward?.(t);
      }
    });
    renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(loop);applyTheme();refreshView();
  addEventListener('resize',refreshView);
  if(new URLSearchParams(location.search).has('e2e'))window.__englishFrame=measureFrame;
  return {thumbnail,update,applyTheme,refreshView,dispose(){cancelAnimationFrame(raf);removeEventListener('resize',refreshView);dispose(stage);floor.geometry.dispose();floor.material.dispose();environment.dispose();pmrem.dispose();renderer.dispose();},get state(){return lastState;}};
}
