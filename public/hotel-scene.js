import * as T from './assets/three.module.min.js';
export async function createHotel(canvas,initialMotion=true){
 const container=canvas.parentElement,mobile=innerWidth<761;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.65));renderer.setSize(container.clientWidth,container.clientHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#a6b7b3');scene.fog=new T.Fog('#a6b7b3',42,95);
 const camera=new T.PerspectiveCamera(mobile?68:57,container.clientWidth/container.clientHeight,.08,140);
 const model=new T.Group();scene.add(model);
 let seed=2803;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),im=x.createImageData(128,128);for(let y=0;y<128;y++)for(let j=0;j<128;j++){const i=(y*128+j)*4;let v=180+rand()*55;if(kind==='wood')v=155+Math.sin(j*.45+Math.sin(y*.04))*18+rand()*35;for(let k=0;k<3;k++)im.data[i+k]=v;im.data[i+3]=255;}x.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,3);t.colorSpace=T.SRGBColorSpace;return t;}
 const stoneTex=texture('stone'),woodTex=texture('wood');
 const mat=(color,roughness=.75,metalness=0,extras={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extras});
 const limestone=mat('#cbbd9e',.91,0,{map:stoneTex,bumpMap:stoneTex,bumpScale:.03}),trim=mat('#e0d4b5',.85),floor=mat('#c1b599',.55,.05,{map:stoneTex}),wood=mat('#684a2c',.46,0,{map:woodTex}),darkWood=mat('#3b3428',.57),bronze=mat('#ad9260',.28,.77),green=mat('#334c3e',.9),linen=mat('#e7e0ca',.98),headboard=mat('#b4a080',.9),leaves=mat('#41674a',.86),soil=mat('#4a5840',1),pot=mat('#9c8b70',.9),black=mat('#273630',.6),water=mat('#537c70',.19,.32),glass=mat('#738b79',.18,.4,{transparent:true,opacity:.30,depthWrite:false,side:T.DoubleSide}),windowMat=mat('#5d7265',.3,.32,{emissive:'#c39b57',emissiveIntensity:.22}),light=new T.MeshBasicMaterial({color:'#fff1c2',toneMapped:false});
 const unit=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cylinder=new T.CylinderGeometry(1,1,1,22);
 function mesh(g,m,x=0,y=0,z=0,p=model){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=m!==glass&&m!==light;o.receiveShadow=true;p.add(o);return o;}
 function box(w,h,d,x,y,z,m,p=model){const o=mesh(unit,m,x,y,z,p);o.scale.set(w,h,d);return o;}
 function cyl(r,h,x,y,z,m,p=model){const o=mesh(cylinder,m,x,y,z,p);o.scale.set(r,h,r);return o;}
 function orb(a,b,c,x,y,z,m,p=model){const o=mesh(sphere,m,x,y,z,p);o.scale.set(a,b,c);return o;}
 function between(a,b,r,m,p=model){const u=new T.Vector3(...a),v=new T.Vector3(...b),o=cyl(r,u.distanceTo(v),0,0,0,m,p);o.position.copy(u).add(v).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.sub(u).normalize());return o;}
 function label(text,w,h,x,y,z,p=model){const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#ded0ad';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#3d4d3b';ctx.font='54px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,88);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),mat('#ffffff',.8,0,{map}),x,y,z,p);}
 // Three-storey boutique hotel, approached through a landscaped courtyard.
 box(105,.15,105,0,-.18,0,soil);box(30,.20,28,0,-.07,-4,floor);box(6,.07,24,0,.015,9,floor);
 for(let z=2;z<22;z+=1.4)box(6,.009,.025,0,.065,z,trim);
 box(26,.30,15,0,.0,-6.6,limestone);box(26,.20,15,0,3.65,-6.6,trim);box(26,.20,15,0,7.23,-6.6,trim);box(26,.25,15,0,10.75,-6.6,trim);
 box(10.7,10.8,.40,-7.67,5.35,.75,limestone);box(10.7,10.8,.40,7.67,5.35,.75,limestone);
 box(4.5,7.2,.40,0,7.16,.75,limestone);
 box(.35,10.8,15,-13,5.35,-6.55,limestone);box(.35,10.8,15,13,5.35,-6.55,limestone);box(26,10.8,.35,0,5.35,-14.0,limestone);
 for(const x of [-12,-8.1,-4.2,4.2,8.1,12])box(.12,10.3,.08,x,5.15,1.0,trim);
 for(const y of [3.5,7.1,10.6])box(26.4,.17,.68,0,y,.83,trim);
 for(const y of [1.8,5.4,9.0])for(const x of [-10.0,-6.0,6.0,10.0]){
   box(2.55,2.30,.10,x,y,1.02,trim);box(2.32,2.12,.08,x,y,1.09,windowMat);
   box(.045,2.15,.06,x,y,1.15,bronze);box(2.33,.045,.06,x,y-.14,1.15,bronze);
   for(const side of [-1,1])box(.26,2.02,.055,x+side*.94,y,1.15,linen);
   box(2.65,.07,.50,x,y-1.20,1.17,trim);
   if(y>2){for(let j=0;j<12;j++)box(.019,.62,.025,x-1.21+j*.22,y-1.13,1.55,bronze);box(2.65,.035,.025,x,y-.8,1.55,bronze);}
 }
 for(const y of [5.4,9]){box(3.2,2.4,.09,0,y,1.04,windowMat);box(.055,2.40,.07,0,y,1.13,bronze);box(3.23,.06,.07,0,y,1.13,bronze);}
 // Shallow canopy, carved columns and a readable hotel sign.
 box(7.0,.23,5.4,0,3.61,2.4,darkWood);box(7.15,.09,5.5,0,3.78,2.4,trim);
 for(const x of [-3.1,3.1]){box(.34,3.40,.34,x,1.75,4.64,trim);box(.47,.12,.47,x,.15,4.64,trim);box(.48,.18,.48,x,3.43,4.64,trim);}
 for(let x=-2.6;x<3;x+=.35)box(.07,.055,4.5,x,3.45,2.4,wood);
 box(4.45,.65,.12,0,3.1,1.11,trim);label('S O L È N E   H O U S E',4.05,.50,0,3.11,1.19);
 for(const x of [-1.9,1.9]){box(.13,2.72,.16,x,1.40,1.15,bronze);box(.44,2.64,.04,x+Math.sign(x)*.28,1.38,1.15,glass);}
 box(3.75,.12,.18,0,2.73,1.17,bronze);box(.1,2.7,.18,-1.34,1.4,1.17,bronze);box(.1,2.7,.18,1.34,1.4,1.17,bronze);
 // Hinged door leaves are excluded from static batching.
 const doors=[];
 for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*1.28,.05,1.18);hinge.userData.moving=true;model.add(hinge);doors.push(hinge);const cx=-side*.64;box(1.23,2.58,.035,cx,1.31,0,glass,hinge);for(const dx of [-.615,.615])box(.044,2.63,.10,cx+dx,1.31,0,bronze,hinge);for(const y of [.04,2.59])box(1.25,.06,.10,cx,y,0,bronze,hinge);box(.035,.65,.045,-side*1.07,1.35,.12,bronze,hinge);}
 for(const x of [-3.6,3.6]){cyl(.42,.73,x,.43,3.7,pot);orb(.57,.63,.57,x,1.12,3.7,leaves);}
 for(const side of [-1,1]){box(5.1,.20,7.6,side*8.5,.12,8.1,trim);box(4.75,.075,7.2,side*8.5,.25,8.1,water);for(let z=5;z<12;z+=1.2){cyl(.045,.47,side*5.33,.30,z,bronze);orb(.07,.075,.07,side*5.33,.60,z,light);}}
 // Hotel lobby: warm limestone, timber reception and comfortable seating.
 box(8,.065,13.5,0,.21,-6.1,floor);box(8,.14,13.5,0,3.48,-6.1,linen);
 box(.18,3.4,6.6,-4,1.9,-2.6,limestone);box(.18,3.4,6.6,4,1.9,-2.6,limestone);
 box(.18,3.4,4.7,-4,1.9,-11.5,limestone);box(.18,3.4,4.7,4,1.9,-11.5,limestone);
 box(.18,.9,3.0,-4,3.07,-7.45,limestone);box(.18,.9,3.0,4,3.07,-7.45,limestone);
 box(3.0,1.05,1.0,-1.8,.76,-8.8,wood);box(3.2,.10,1.16,-1.8,1.32,-8.8,trim);
 for(let x=-3.23;x<-.3;x+=.13)box(.06,.88,.04,x,.74,-8.27,wood);
 box(3.1,.025,.03,-1.8,1.18,-8.23,light);box(.30,.40,.12,-2.3,1.57,-8.9,black);box(.36,.025,.22,-2.3,1.37,-8.86,bronze);
 label('Welcome to Solène',2.0,.35,-1.8,2.33,-10.2);
 function lounge(x,z,rotation=0){const g=new T.Group();g.position.set(x,.25,z);g.rotation.y=rotation;model.add(g);box(1.85,.35,.88,0,.25,0,green,g);box(1.85,.50,.21,0,.56,-.38,green,g);for(const s of [-1,1])box(.17,.40,1,s*.90,.51,0,green,g);for(const s of [-1,1]){box(.82,.12,.69,s*.43,.47,.01,linen,g);box(.53,.46,.14,s*.44,.71,-.16,headboard,g).rotation.x=.13;}}
 lounge(2.3,-4.1,Math.PI/2);lounge(-2.3,-4.1,-Math.PI/2);cyl(.54,.065,0,.75,-4.8,trim);cyl(.12,.40,0,.50,-4.8,bronze);box(2.8,.018,3.3,0,.26,-4.6,headboard);
 function vase(x,y,z){cyl(.12,.28,x,y+.14,z,pot);for(let i=0;i<7;i++){const a=i*.93;between([x,y+.18,z],[x+Math.sin(a)*.19,y+.66+rand()*.12,z+Math.cos(a)*.12],.007,leaves);orb(.09,.02,.037,x+Math.sin(a)*.18,y+.60+rand()*.10,z+Math.cos(a)*.10,leaves);}}
 vase(0,.80,-4.8);vase(-.6,1.38,-8.8);
 for(const z of [-2.4,-5.8,-9.2]){between([0,3.4,z],[0,2.91,z],.016,bronze);cyl(.40,.04,0,2.89,z,light);const shade=mesh(new T.CylinderGeometry(.15,.44,.29,30,1,true),mat('#e4d6af',.9,0,{emissive:'#ffcb82',emissiveIntensity:.4,side:T.DoubleSide}),0,3.02,z);}
 // Two guest-room wings in the same hotel, with different floor areas and fittings.
 function bedroom(side,suite=false){const cx=side*8.35;box(8.25,.05,8.7,cx,.23,-9.25,floor);box(8.25,.12,8.7,cx,3.5,-9.25,linen);box(8.25,3.2,.18,cx,1.86,-4.95,limestone);
   box(3.35,.08,3.65,cx,.29,-10,headboard);box(2.08,.38,2.50,cx,.57,-10.40,wood);box(2.05,.29,2.46,cx,.88,-10.40,linen);box(2.36,1.36,.17,cx,1.20,-11.67,headboard);box(2.04,.11,1.58,cx,1.075,-9.95,linen);box(2.10,.045,.54,cx,1.14,-9.08,green);
   for(const s of [-1,1]){const pillow=box(.81,.21,.52,cx+s*.47,1.11,-11.13,linen);pillow.rotation.x=.12;box(.54,.60,.52,cx+s*1.57,.60,-11.27,wood);cyl(.12,.03,cx+s*1.57,.93,-11.27,bronze);cyl(.022,.29,cx+s*1.57,1.08,-11.27,bronze);mesh(new T.CylinderGeometry(.13,.23,.30,20),linen,cx+s*1.57,1.36,-11.27);}
   box(4.5,2.50,.035,cx,1.8,-13.72,windowMat);for(const x of [-2.2,0,2.2])box(.05,2.5,.05,cx+x,1.8,-13.64,bronze);
   for(const s of [-1,1])for(let i=0;i<10;i++)cyl(.06,2.6,cx+s*(2.32+i*.085),1.77,-13.50,linen);
   if(suite){lounge(cx+2.55,-7.0,Math.PI);cyl(.44,.06,cx+2.55,.75,-8.02,trim);cyl(.10,.38,cx+2.55,.52,-8.02,bronze);box(1.8,.68,.42,cx-2.50,.6,-6.70,wood);label('SIGNATURE SUITE',1.3,.22,cx-2.50,1.50,-6.47);}
   else{const chair=cyl(.43,.39,cx+2.30,.55,-7.0,green);box(.73,.58,.15,cx+2.30,.98,-7.36,green);cyl(.34,.05,cx+1.32,.77,-7.0,trim);cyl(.07,.50,cx+1.32,.49,-7.0,bronze);label('DELUXE KING',1.2,.22,cx-2.2,1.50,-6.35);}
   vase(cx-2.5,.4,-12.80);
 }
 bedroom(1);bedroom(-1,true);
 // Sculpted trees and hedges around the building.
 function tree(x,z,scale=1){const g=new T.Group();g.position.set(x,.1,z);g.scale.setScalar(scale);model.add(g);cyl(.10,3,0,1.5,0,wood,g);const f=new T.InstancedMesh(new T.SphereGeometry(1,6,4),leaves,mobile?55:90),obj=new T.Object3D();for(let i=0;i<f.count;i++){const a=rand()*Math.PI*2,r=rand()*1.2;obj.position.set(Math.cos(a)*r,2.7+rand()*1.3,Math.sin(a)*r);obj.scale.set(.20+rand()*.27,.13+rand()*.19,.18+rand()*.24);obj.rotation.set(rand(),rand()*4,rand());obj.updateMatrix();f.setMatrixAt(i,obj.matrix);f.setColorAt(i,new T.Color().setScalar(.8+rand()*.4));}f.castShadow=true;g.add(f);}
 for(const s of [-1,1]){for(const z of [-11,-3,6,15])tree(s*(14.4+rand()),z,1.2+rand()*.65);for(let z=-12;z<12;z+=1.2)orb(.6,.6,.65,s*14.2,.55,z,leaves);}
 for(let i=0;i<8;i++)tree(-28+i*8,-26-rand()*5,2+rand()*2);
 scene.add(new T.HemisphereLight('#fff2d7','#6e8573',2.1));const sun=new T.DirectionalLight('#ffe7b7',3.2);sun.position.set(-18,24,20);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.camera.left=-27;sun.shadow.camera.right=27;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.camera.near=1;sun.shadow.camera.far=85;sun.shadow.normalBias=.05;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
 for(const [x,y,z] of [[0,2.8,-2],[0,2.8,-7],[8.3,2.7,-10],[-8.3,2.7,-10]]){const p=new T.PointLight('#ffce8b',12,9,2);p.position.set(x,y,z);scene.add(p);}
 const environment=await new Promise(resolve=>new T.TextureLoader().load('./assets/hotel.webp',resolve,undefined,()=>resolve(null)));
 if(environment){environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(environment).texture;scene.environmentIntensity=.25;pmrem.dispose();environment.dispose();}
 // Static geometry is merged by material; only door leaves stay separate.
 scene.updateMatrixWorld(true);const batches=new Map(),remove=[];
 model.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;let p=o;while(p){if(p.userData.moving)return;p=p.parent;}let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const f=g.toNonIndexed();g.dispose();g=f;}if(!batches.has(o.material.uuid))batches.set(o.material.uuid,{material:o.material,list:[]});batches.get(o.material.uuid).list.push(g);remove.push(o);});
 for(const {material,list} of batches.values()){const merged=new T.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const total=list.reduce((n,g)=>n+g.getAttribute('position').count*size,0),array=new Float32Array(total);let offset=0;for(const g of list){const attr=g.getAttribute(name);if(attr)array.set(attr.array,offset);offset+=g.getAttribute('position').count*size;}merged.setAttribute(name,new T.BufferAttribute(array,size));}merged.computeBoundingSphere();const m=new T.Mesh(merged,material);m.castShadow=material!==glass&&material!==light;m.receiveShadow=true;scene.add(m);list.forEach(g=>g.dispose());}remove.forEach(o=>o.removeFromParent());
 const positions=[[18,11.3,29],[0,2.25,9.7],[0,2.10,-3.7],[5.65,2.05,-7.30]].map(a=>new T.Vector3(...a));
 const targets=[[0,4.35,-1.5],[0,1.85,-4.7],[0,1.75,-8.2],[8.3,1.25,-10.8]].map(a=>new T.Vector3(...a));
 let path=new T.CatmullRomCurve3(positions,false,'catmullrom',.24),lookPath=new T.CatmullRomCurve3(targets,false,'catmullrom',.25),desired=0,current=0,motion=initialMotion,paused=false,raf=0,last=0,lastDraw=0,door=0,forced=false,elapsed=0;
 const position=new T.Vector3(),look=new T.Vector3();
 function draw(now){if(paused)return;raf=requestAnimationFrame(draw);if(now-lastDraw<(mobile?30:15))return;const dt=Math.min(.05,(now-(last||now))/1000);last=lastDraw=now;elapsed+=dt;current=motion?current+(desired-current)*(1-Math.exp(-dt*5.4)):Math.round(desired*3)/3;path.getPoint(current,position);lookPath.getPoint(current,look);if(motion){position.y+=Math.sin(elapsed*.25)*.009;position.x+=Math.sin(elapsed*.18)*.015;}camera.position.copy(position);camera.lookAt(look);if(innerWidth<761){const w=container.clientWidth,h=container.clientHeight,offset=h*.22*Math.max(0,Math.min(1,(current-.76)/.13));if(w&&h)camera.setViewOffset(w,h,0,offset,w,h);}else if(camera.view?.enabled)camera.clearViewOffset();const openness=forced?1:Math.max(0,Math.min(1,(current-.31)/.20));door=motion?door+(openness-door)*(1-Math.exp(-dt*6)):openness;doors[0].rotation.y=door*Math.PI*.50;doors[1].rotation.y=-door*Math.PI*.50;renderer.shadowMap.needsUpdate=Math.abs(door-openness)>.002;renderer.render(scene,camera);}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.fov=innerWidth<761?68:57;camera.updateProjectionMatrix();renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<761?1.35:1.65));}
 addEventListener('resize',resize,{passive:true});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;cancelAnimationFrame(raf);container.classList.remove('ready');});canvas.addEventListener('webglcontextrestored',()=>{paused=false;last=0;raf=requestAnimationFrame(draw);container.classList.add('ready');});
 camera.position.copy(positions[0]);camera.lookAt(targets[0]);renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;raf=requestAnimationFrame(draw);
 return {setProgress(t){desired=Math.max(0,Math.min(1,t));if(t<.1)forced=false;},openDoors(){forced=true;},setRoomType(type){const s=type==='suite'?-1:1;positions[3].set(s*5.65,2.05,-7.30);targets[3].set(s*8.3,1.25,-10.8);path=new T.CatmullRomCurve3(positions,false,'catmullrom',.24);lookPath=new T.CatmullRomCurve3(targets,false,'catmullrom',.25);},setMotion(v){motion=v;},pause(){paused=true;cancelAnimationFrame(raf);},resume(){if(paused){paused=false;last=0;raf=requestAnimationFrame(draw);}},resize};
}
