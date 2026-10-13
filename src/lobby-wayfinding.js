import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const SKIN_LOCKER = {x:12,z:6};
export const nearSkinLocker = p => !!p && Math.hypot(p.x-SKIN_LOCKER.x,p.z-SKIN_LOCKER.z)<3;
export function createLobbyWayfinding(parent,label) {
 const arrows=[];
 for(const side of [-1,1]) {
  const g=new THREE.Group();g.position.set(side*3.55,2.7,24);parent.add(g);
  const shape=new THREE.Shape().moveTo(-1.1,-.22).lineTo(.15,-.22).lineTo(.15,-.62).lineTo(1.1,0).lineTo(.15,.62).lineTo(.15,.22).lineTo(-1.1,.22).closePath();
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.07,bevelThickness:.06}),new THREE.MeshStandardMaterial({color:side===1?'#c6b7f0':'#f0d17d',emissive:side===1?'#74629d':'#ae8240',emissiveIntensity:.35,metalness:.4,roughness:.4}));
  // Hall is approached facing +z, so arrows face the approaching player.
  m.rotation.y=side===1?0:Math.PI;g.add(m);
  const text=label(side===1?'Battlefield practice':'Poker practice',side===1?'#e3d6ff':'#ffe0a0',4);text.position.set(0,1.1,0);g.add(text);arrows.push(g);
 }
 const root=new THREE.Group();root.position.set(SKIN_LOCKER.x,0,SKIN_LOCKER.z);root.rotation.y=-Math.PI/2;parent.add(root);
 const wood=new THREE.MeshStandardMaterial({color:'#554366',roughness:.6}),brass=new THREE.MeshStandardMaterial({color:'#d7bd80',metalness:.45,roughness:.35});
 function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.06),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);}
 box(2.4,3.3,.8,0,1.65,0,wood);
 for(const x of [-.59,.59]){box(1.1,3.06,.09,x,1.65,.44,new THREE.MeshStandardMaterial({color:'#a294b0',roughness:.7}));box(.08,.36,.12,x+(x<0?.35:-.35),1.5,.52,brass);for(let i=0;i<3;i++)box(.52,.035,.035,x,2.65-i*.14,.51,wood);}
 const sign=label('Skin locker · Enter to change','#ffdf9e',5);sign.position.set(0,4.3,0);root.add(sign);
 const down=new THREE.Mesh(new THREE.ConeGeometry(.3,.55,4),brass);down.rotation.z=Math.PI;down.position.set(0,3.65,0);root.add(down);
 return {frame(time,reduced){arrows.forEach((a,i)=>{a.position.y=2.7+(reduced?0:Math.sin(time*2+i)*.13);});down.position.y=3.7+(reduced?0:Math.sin(time*2)*.1);}};
}
