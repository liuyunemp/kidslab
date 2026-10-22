import * as T from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {createObjectPool} from './objects.js';
export function createScene({canvas,area,labels,onAction,language}){
  let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true});}catch{return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-5,5,5,-5,.1,100),pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xfff4df,0x536d78,.8));const key=new T.DirectionalLight(0xfff7ea,1.8);key.position.set(-5,12,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12});key.shadow.bias=-.001;scene.add(key);
  const fill=new T.DirectionalLight(0xa8c9ff,.5);fill.position.set(7,5,-4);scene.add(fill);
  const group=new T.Group(),pool=createObjectPool(group);scene.add(group);const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);
  let current=null,palette={},entries=[],center=new T.Vector3(),bounds=null,size=7,yaw=0,width=0,height=0,drag=null,frame=0,dirty=true;const ray=new T.Raycaster(),pointer=new T.Vector2(),projected=new T.Vector3(),LABEL_LIFT={lamp:.25,land:.13,flower:1.2};
  const pickLabel=value=>Array.isArray(value)?value[language()==='en'?1:0]:value;
  function colors(){const css=getComputedStyle(document.documentElement);for(const k of ['stage','tile','wood','metal','dark','red','green','blue','yellow','water','paper'])palette[k]=css.getPropertyValue('--'+k).trim();scene.background=new T.Color(palette.stage);floor.material.color.set(palette.stage);}
  function fit(){
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);}
    const rect=area.getBoundingClientRect(),aspect=width/height;
    camera.position.copy(center).add(new T.Vector3(Math.sin(yaw)*size,current?.overhead?size*3:size*.9,Math.cos(yaw)*size*(current?.overhead?.65:1.15)));camera.lookAt(center);
    camera.updateMatrixWorld();const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),xs=[],ys=[];
    if(bounds)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y+.5])for(const z of [bounds.min.z,bounds.max.z]){const v=new T.Vector3(x,y,z).sub(center);xs.push(v.dot(right));ys.push(v.dot(up));}
    const spanX=xs.length?Math.max(...xs)-Math.min(...xs):size,spanY=ys.length?Math.max(...ys)-Math.min(...ys):size;
    const worldHeight=1.16*Math.max(spanY*height/Math.max(rect.height,140),spanX*height/Math.max(rect.width,240));
    camera.left=-worldHeight*aspect/2;camera.right=worldHeight*aspect/2;camera.top=worldHeight/2;camera.bottom=-worldHeight/2;
    camera.setViewOffset(width,height,width/2-(rect.left+rect.width/2),height/2-(rect.top+rect.height/2),width,height);camera.updateProjectionMatrix();
    dirty=true;
  }
  function update(view){
    current=view;colors();entries=pool.sync(view.objects,palette,performance.now());
    if(drag?.picked&&!entries.includes(drag.picked))release({pointerId:drag.id});
    for(const entry of entries){const o=entry.o;
      if(o.label||o.action){
        const tag=o.action?'BUTTON':'SPAN';
        if(entry.label?.tagName!==tag){
          entry.label?.remove();entry.label=document.createElement(tag);entry.labelKey=null;
          if(o.action)entry.label.addEventListener('click',()=>onAction(entry.o.action));
          labels.append(entry.label);
        }
        const label=entry.label,key=JSON.stringify([o.type,o.label,o.cell,o.target,language()]);
        label.className='stage-label'+(o.action?' stage-hit':'')+(o.type==='lamp'?' lamp':'')+(o.type==='land'?' river-cell':'');
        if(key!==entry.labelKey){
          label.textContent=pickLabel(o.label)||(o.cell!==undefined?String(o.cell+1):'●');entry.labelKey=key;
          if(o.type==='lamp'){const dot=document.createElement('span');dot.className='target-dot'+(o.target?' on':'');dot.setAttribute('aria-hidden','true');label.append(dot);}
        }
        if(o.type==='land'){label.dataset.dug=String(Boolean(o.depth));label.dataset.marked=String(Boolean(o.source||o.on));}
        if(o.action){label.dataset.action=JSON.stringify(o.action);label.setAttribute('aria-label',o.type==='lamp'?`${language()==='en'?'Switch':'开关'} ${o.label}`:o.type==='lever'?`${language()==='en'?'Points':'道岔'} ${o.label}`:`${language()==='en'?'Cell':'河格'} ${o.cell+1}`);}
        if(o.type==='lamp'){label.dataset.lit=String(Boolean(o.on));label.title=language()==='en'?`Target: ${o.target?'on':'off'}`:`目标：${o.target?'亮':'灭'}`;}
      }else if(entry.label){entry.label.remove();entry.label=null;}
    }
    // Frame the final positions, while preserving in-flight movement for drawing.
    const positions=entries.map(e=>e.mesh.position.clone());entries.forEach(e=>e.mesh.position.copy(e.target));
    bounds=new T.Box3().setFromObject(group);entries.forEach((e,i)=>e.mesh.position.copy(positions[i]));
    group.updateMatrixWorld(true);
    bounds.getCenter(center);center.y=Math.min(center.y,.8);size=view.size;fit();
    dirty=true;
  }
  function closest(event){pointer.set(event.clientX/width*2-1,1-event.clientY/height*2);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(group.children,true);if(hits.length){let obj=hits[0].object;while(obj.parent&&obj.parent!==group)obj=obj.parent;const found=entries.find(e=>e.mesh===obj);if(found?.o.draggable)return found;}
    return entries.find(e=>{if(!e.o.draggable)return false;const v=e.mesh.position.clone().add(new T.Vector3(0,.5,0)).project(camera);return Math.hypot((v.x+1)*width/2-event.clientX,(1-v.y)*height/2-event.clientY)<28;});
  }
  canvas.addEventListener('pointerdown',e=>{const picked=closest(e);drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,picked,moved:false};canvas.setPointerCapture(e.pointerId);if(picked)picked.mesh.position.y+=.16;dirty=true;});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.moved ||=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;if(drag.picked){if(Math.hypot(dx,dy)>28){onAction({type:'move',dir:Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up'});drag.lastX=e.clientX;drag.lastY=e.clientY;}}else{yaw=Math.max(-.65,Math.min(.65,yaw+dx*.005));drag.lastX=e.clientX;fit();}});
  const release=e=>{if(drag?.id!==e.pointerId)return;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  let lastTime=null;
  function placeLabel(e){const pos=projected.copy(e.mesh.position);pos.y+=LABEL_LIFT[e.o.type]??.95;pos.project(camera);e.label.style.left=((pos.x+1)*width/2)+'px';e.label.style.top=((1-pos.y)*height/2)+'px';}
  function animate(now){frame=requestAnimationFrame(animate);const dt=lastTime===null?0:Math.min(.05,(now-lastTime)/1000);lastTime=now;if(document.hidden)return;
    let moving=false;
    for(const e of entries){const t=Math.min(1,(now-e.start)/180);
      if(t<1){e.mesh.position.lerpVectors(e.from,e.target,1-(1-t)**3);moving=true;}
      if(e.mesh.userData.rotor&&e.o.spin){e.mesh.userData.rotor.rotation.y+=dt*e.o.spin;moving=true;}
      if(e.o.type==='bee'&&t>=1)e.mesh.position.y=e.target.y+Math.sin(now*.006)*.035;
      if(e.o.type==='bee')moving=true;
    }
    // A settled scene costs nothing: skip both the GPU draw and per-label layout.
    if(!moving&&!dirty)return;
    dirty=false;
    for(const e of entries)if(e.label)placeLabel(e);
    renderer.render(scene,camera);}
  window.addEventListener('resize',fit);const observer=new ResizeObserver(fit);observer.observe(area);colors();fit();frame=requestAnimationFrame(animate);
  return {update,resize:fit,theme(){if(current)update(current);},destroy(){cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',fit);pool.dispose();floor.geometry.dispose();floor.material.dispose();environment.dispose();renderer.dispose();}};
}
