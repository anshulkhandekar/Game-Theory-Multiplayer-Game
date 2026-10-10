import * as THREE from 'three';
const logo = new Image(); logo.src = '/assets/panda-logo.png';
const palette = {adsc:'#30256d',google:'#f4f2e9',janestreet:'#182f48',amazon:'#263340',equilibrium:'#4d667d',poker:'#803d56',sweet:'#efacba'};
// All garments live inside the avatar rig; physics never sees these meshes.
export function dressBear(rig, arms, appearance, accent) {
  function piece(geometry,color,x,y,z,parent=rig) {
    const material = new THREE.MeshStandardMaterial({color,roughness:.85});
    const obj = new THREE.Mesh(geometry,material); obj.userData.wardrobeMaterial = true; obj.position.set(x,y,z); parent.add(obj); return obj;
  }
  function print(draw,x,y,z,w,h,parent=rig) {
    const canvas = document.createElement('canvas'); canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');draw(ctx);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);plane.userData.wardrobeMaterial = true; plane.position.set(x,y,z);parent.add(plane);
    return {ctx,texture};
  }
  const shirt=palette[appearance.shirt];
  if(shirt) {
    piece(new THREE.SphereGeometry(.493,24,16,0,Math.PI*2,.53,1.96),shirt,0,.78,0).scale.set(1,1.2,.85);
    // Sleeve caps share each shoulder hinge, including emotes.
    for(const arm of arms) piece(new THREE.SphereGeometry(.184,12,8),shirt,0,-.1,0,arm).scale.set(1,.72,1);
    const collar=piece(new THREE.TorusGeometry(.275,.026,8,28),shirt,0,1.25,0);collar.rotation.x=Math.PI/2;
    if(appearance.shirt==='adsc') {
      const draw=ctx=>{ctx.clearRect(0,0,512,256);if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,128,0,256,256);else {ctx.fillStyle='#fff';ctx.font='bold 90px sans-serif';ctx.fillText('ADSC',90,170);}};
      const badge=print(draw,.19,1.01,.377,.26,.13);
      badge.texture.anisotropy=4;
      if(!logo.complete)logo.addEventListener('load',()=>{draw(badge.ctx);badge.texture.needsUpdate=true;},{once:true});
    } else print(ctx=>{
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font='bold 65px sans-serif';
      if(appearance.shirt==='google') {
        const letters=['#4285f4','#ea4335','#fbbc05','#4285f4','#34a853','#ea4335'];ctx.font='bold 78px sans-serif';
        [...'Google'].forEach((letter,i)=>{ctx.fillStyle=letters[i];ctx.fillText(letter,90+i*65,125);});
      } else if(appearance.shirt==='amazon') {
        ctx.fillText('amazon',256,100);ctx.strokeStyle='#ffb64c';ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(255,152,110,28,0,0,Math.PI);ctx.stroke();
      } else if(appearance.shirt==='janestreet') {ctx.font='bold 48px serif';ctx.fillText('JANE STREET',256,125);}
      else if(appearance.shirt==='equilibrium') {ctx.font='bold 52px sans-serif';ctx.fillText('NASH',256,95);ctx.font='32px sans-serif';ctx.fillText('equilibrium',256,155);}
      else if(appearance.shirt==='poker') {ctx.font='100px serif';ctx.fillText('♠ ♥ ♣ ♦',256,125);}
      else {ctx.fillStyle='#c34367';ctx.font='bold 48px sans-serif';ctx.fillText('strawberry',256,100);ctx.font='42px sans-serif';ctx.fillText('milk',256,155);}
    },0,.9,.424,.57,.285);
  }
  if(appearance.color==='bowtie') {
    for(const side of [-1,1]) {const bow=piece(new THREE.SphereGeometry(.11,12,8),accent,side*.1,1.12,.3);bow.scale.set(1.3,.65,.5);bow.rotation.z=side*.3;}
    piece(new THREE.SphereGeometry(.055,12,8),'#f4e7dc',0,1.12,.33);
  }
  if(appearance.color==='tie') {
    piece(new THREE.SphereGeometry(.06,10,8),accent,0,1.15,.29);
    const tie=piece(new THREE.ConeGeometry(.075,.34,4),accent,0,.94,.43);tie.rotation.z=Math.PI;tie.scale.z=.35;
  }
  if(appearance.hat==='headphones') {
    const band=piece(new THREE.TorusGeometry(.48,.047,8,32,Math.PI),'#44405c',0,1.58,0);band.rotation.z=0;
    for(const side of [-1,1]) {
      piece(new THREE.SphereGeometry(.17,12,8),'#292b3e',side*.48,1.55,0).scale.set(.5,1,1);
      piece(new THREE.SphereGeometry(.12,12,8),'#bba5ea',side*.55,1.55,0).scale.set(.4,1,1);
    }
  }
  if(appearance.hat==='beanie') {
    piece(new THREE.SphereGeometry(.4,20,12,0,Math.PI*2,0,Math.PI/2),'#ad85cd',0,1.83,0).scale.y=.65;
    const brim=piece(new THREE.TorusGeometry(.395,.055,10,28),'#8561a7',0,1.85,0);brim.rotation.x=Math.PI/2;
    piece(new THREE.SphereGeometry(.095,12,8),'#e0cbee',0,2.12,0);
  }
  if(['shades','money','heart'].includes(appearance.glasses)) {
    for(const side of [-1,1]) {
      if(appearance.glasses==='shades') {const lens=piece(new THREE.BoxGeometry(.25,.14,.045),'#161b28',side*.17,1.58,.55);lens.rotation.z=-side*.07;}
      else if(appearance.glasses==='money') {
        piece(new THREE.TorusGeometry(.135,.022,8,24),'#eaca66',side*.17,1.58,.55);
        print(ctx=>{ctx.textAlign='center';ctx.fillStyle='#eaca66';ctx.font='bold 200px serif';ctx.fillText('$',256,205);},side*.17,1.58,.56,.2,.1);
      } else {
        const shape=new THREE.Shape();shape.moveTo(0,-.12);shape.bezierCurveTo(-.28,.08,-.13,.24,0,.1);shape.bezierCurveTo(.13,.24,.28,.08,0,-.12);
        piece(new THREE.ShapeGeometry(shape),'#eb739b',side*.17,1.58,.56).scale.set(.65,.65,1);
      }
    }
    piece(new THREE.BoxGeometry(.12,.025,.03),appearance.glasses==='money'?'#eaca66':'#34313d',0,1.58,.55);
  }
  if(appearance.glasses==='monocle') {
    piece(new THREE.TorusGeometry(.145,.02,8,28),'#eaca66',.17,1.58,.55);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.3,1.57,.5),new THREE.Vector3(.4,1.3,.4),new THREE.Vector3(.34,1.13,.3)]);
    piece(new THREE.TubeGeometry(curve,12,.009,5,false),'#eaca66',0,0,0);
  }
}
