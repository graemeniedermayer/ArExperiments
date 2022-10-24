const zero = new THREE.Vector3(0,0,0) 

let gui = new dat.GUI()
let guiSystem1 = gui.addFolder('system1');
let guiSystem2 = gui.addFolder('system2');
let guiSystem3 = gui.addFolder('system3');

const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute float blend;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;
varying float vBlend;

void main() {
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
  vBlend = blend;
}`;

const _FS = `

uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;
varying float vBlend;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  float coordLength = length(gl_PointCoord - 0.5);
  float fallOff = 1.0 - 2.0*coordLength;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
  gl_FragColor.xyz *= gl_FragColor.w*fallOff;
  gl_FragColor.w *= vBlend*fallOff;
}`;


class LinearSpline {
  constructor(lerp) {
    this.points_ = [];
    this._lerp = lerp;
  }
  clearPoints(){
    this.points_ = []
  }

  AddPoint(t, d) {
    this.points_.push([t, d]);
  }

  Get(t) {
    let p1 = 0;

    for (let i = 0; i < this.points_.length; i++) {
      if (this.points_[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(this.points_.length - 1, p1 + 1);

    if (p1 == p2) {
      return this.points_[p1][1];
    }

    return this._lerp(
        (t - this.points_[p1][0]) / (
            this.points_[p2][0] - this.points_[p1][0]),
        this.points_[p1][1], this.points_[p2][1]);
  }
}

class ParticleEmitter {
  constructor() {
    this.alphaSpline_ = new LinearSpline((t, a, b) => {
      return a + t * (b - a);
    });

    this.colourSpline_ = new LinearSpline((t, a, b) => {
      const c = a.clone();
      return c.lerp(b, t);
    });

    this.sizeSpline_ = new LinearSpline((t, a, b) => {
      return a + t * (b - a);
    });
    this.emissionRate_ = 0.0;
    this.emissionAccumulator_ = 0.0;
    this.particles_ = [];
    this.emitterLife_ = null;
    this.delay_ = 0.0;
    this.rotationSpeed = 0.5;
    this.lifeTime = 5.0;
    this.speed = 40.0
  }
  OnDestroy() {
  }
  UpdateParticles_(timeElapsed) {
    for (let p of this.particles_) {
      p.life -= timeElapsed;
    }

    this.particles_ = this.particles_.filter(p => {
      return p.life > 0.0;
    });

    for (let i = 0; i < this.particles_.length; ++i) {
      const p = this.particles_[i];
      const t = 1.0 - p.life / p.maxLife;
      if (t < 0 || t > 1) {
        let a =  0;
      }

      p.rotation += timeElapsed * this.rotationSpeed;
      p.alpha = this.alphaSpline_.Get(t);
      p.currentSize = p.size * this.sizeSpline_.Get(t);
      p.colour.copy(this.colourSpline_.Get(t));

      p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));
      p.velocity.multiplyScalar(p.drag);

      // const drag = p.velocity.clone();
      // drag.multiplyScalar(timeElapsed * 0.1);
      // drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      // drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      // drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      // p.velocity.sub(drag);
    }
  }
  
  AddParticles(num, p=zero) {
    for (let i = 0; i < num; ++i) {
      this.particles_.push(this.CreateParticle_(p));
    }
  }
  CreateParticle_(p=zero) {
    const life = (Math.random() * 0.75 + 0.25) * this.lifeTime;
    const speed = this.speed
    return {
        position: new THREE.Vector3(
            (Math.random() * 2 - 1) * .04 + -.44,
            (Math.random() * 2 - 1) * .04 + 0,
            (Math.random() * 2 - 1) * .04 + .12).add(p),
        size: (Math.random() * 0.5 + 0.5) * 2.0,
        colour: new THREE.Color(),
        alpha: 0.0,
        life: life,
        maxLife: life,
        rotation: Math.random() * 2.0 * Math.PI,
        velocity: new THREE.Vector3(0, 0, -speed),
        blend: 0.1,
        drag: 1.0,
    };
  }
  get IsAlive() {
    if (this.emitterLife_ === null) {
      return this.particles_.length > 0;
    } else {
      return this.emitterLife_ > 0.0 || this.particles_.length > 0;
    }
  }
  get IsEmitterAlive() {
    return (this.emitterLife_ === null || this.emitterLife_ > 0.0);
  }
  SetLife(life) {
    this.emitterLife_ = life;
  }
  SetEmissionRate(rate) {
    this.emissionRate_ = rate;
  }
  OnUpdate_(_) {
  }
  Update(timeElapsed) {
    if(this.delay_ > 0.0) {
      this.delay_ -= timeElapsed;
      return;
    }
    this.OnUpdate_(timeElapsed);
    if (this.emitterLife_ !== null) {
      this.emitterLife_ -= timeElapsed;
    }
    if (this.emissionRate_ > 0.0 && this.IsEmitterAlive) {
      this.emissionAccumulator_ += timeElapsed;
      const n = Math.floor(this.emissionAccumulator_ * this.emissionRate_);
      this.emissionAccumulator_ -= n / this.emissionRate_;
  
      for (let i = 0; i < n; i++) {
        const p = this.CreateParticle_(this.offset);
        this.particles_.push(p);
      }
    }
    this.UpdateParticles_(timeElapsed);
  }
};
  
class ParticleSystem {
  constructor(params) {
    const uniforms = {
        diffuseTexture: {
            value: new THREE.TextureLoader().load(params.texture)
        },
        pointMultiplier: {
            value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
        }
    };

    this.material_ = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: _VS,
        fragmentShader: _FS,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    this.camera_ = params.camera;
    this.particles_ = [];

    this.geometry_ = new THREE.BufferGeometry();
    this.geometry_.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.geometry_.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    this.geometry_.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
    this.geometry_.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));
    this.geometry_.setAttribute('blend', new THREE.Float32BufferAttribute([], 1));

    this.points_ = new THREE.Points(this.geometry_, this.material_);

    params.parent.add(this.points_);

    this.emitters_ = [];
    this.particles_ = [];

    this.UpdateGeometry_();
  }

  Destroy() {
    this.material_.dispose();
    this.geometry_.dispose();
    if (this.points_.parent) {
      this.points_.parent.remove(this.points_);
    }
  }

  AddEmitter(e) {
    this.emitters_.push(e);
  }
  UpdateGeometry_() {

	  let y = new THREE.Vector3(1,0,0).applyQuaternion(this.camera_.quaternion).y
	  let upsideDown = new THREE.Vector3(0,1,0).applyQuaternion(this.camera_.quaternion).y>0
    let tilt = upsideDown ? Math.asin(y):-Math.asin(y)
    const positions = [];
    const sizes = [];
    const colours = [];
    const angles = [];
    const blends = [];

    const box = new THREE.Box3();
    for (let p of this.particles_) {
      positions.push(p.position.x, p.position.y, p.position.z);
      colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
      sizes.push(p.currentSize);
      angles.push(p.rotation+tilt);
      blends.push(p.blend);

      box.expandByPoint(p.position);
    }

    this.geometry_.setAttribute(
        'position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry_.setAttribute(
        'size', new THREE.Float32BufferAttribute(sizes, 1));
    this.geometry_.setAttribute(
        'colour', new THREE.Float32BufferAttribute(colours, 4));
    this.geometry_.setAttribute(
        'angle', new THREE.Float32BufferAttribute(angles, 1));
    this.geometry_.setAttribute(
        'blend', new THREE.Float32BufferAttribute(blends, 1));
  
    this.geometry_.attributes.position.needsUpdate = true;
    this.geometry_.attributes.size.needsUpdate = true;
    this.geometry_.attributes.colour.needsUpdate = true;
    this.geometry_.attributes.angle.needsUpdate = true;
    this.geometry_.attributes.blend.needsUpdate = true;
    this.geometry_.boundingBox = box;
    this.geometry_.boundingSphere = new THREE.Sphere();

    box.getBoundingSphere(this.geometry_.boundingSphere);
  }

  UpdateParticles_(timeElapsed) {
    this.particles_ = this.emitters_.map(e => e.particles_);
    this.particles_ = this.particles_.flat();
    this.particles_.sort((a, b) => {
      const d1 = this.camera_.position.distanceTo(a.position);
      const d2 = this.camera_.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }

      if (d1 < d2) {
        return 1;
      }

      return 0;
    });
  }
  UpdateEmitters_(timeElapsed) {
    for (let i = 0; i < this.emitters_.length; ++i) {
      this.emitters_[i].Update(timeElapsed);
    }
    const dead = this.emitters_.filter(e => !e.IsAlive);
    for (let d of dead) {
      d.OnDestroy();
    }
    this.emitters_= this.emitters_.filter(e => e.IsAlive);
  }

  Update(timeElapsed) {
    this.UpdateEmitters_(timeElapsed);
    this.UpdateParticles_(timeElapsed);
    this.UpdateGeometry_();
  }
}


let camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.0001, 20000 );
let renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
let clock = new THREE.Clock()

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

let scene = new THREE.Scene();

function OnWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', () => {
    OnWindowResize();
  }, false);

animate();
let group1 = new THREE.Group()
let group2 = new THREE.Group()
let group3 = new THREE.Group()
group1.position.x+=.5
group2.position.x+=0
group3.position.x+=-.5
scene.add(group3)
scene.add(group2)

scene.add(group1)
let textureNames = [
  'colorFlames',
  'energy',
  'energyParticles',
  'flames',
  'flamesblue',
  'flamesSmoke',
  'flowerOutlines',
  'flowers',
  'frost',
  'largeMetal',
  'lightning',
  'moond',
  'redParticles',
  'sparks',
  'stars',
  'strings',
  'sunFlower',
  'peddles',
  'purpleFlower'
  
]

initTexture1 =  'purpleFlower'
initTexture2 ='stars'
initTexture3 = 'peddles'

let partSystem3 = new ParticleSystem({
  camera: camera,
  parent: group3,
  texture: "/static/eave/experiment/particles/"+initTexture3+'.png',
});
let partSystem1 = new ParticleSystem({
  camera: camera,
  parent: group1,
  texture: "/static/eave/experiment/particles/"+ initTexture1+'.png',
});
let partSystem2 = new ParticleSystem({
  camera: camera,
  parent: group2,
  texture: "/static/eave/experiment/particles/"+initTexture2 +'.png',
});

let setEmitter = (emitter) =>{
  emitter.alphaSpline_.AddPoint(0.0, 0.2);
  emitter.alphaSpline_.AddPoint(0.4, 1.0);
  emitter.alphaSpline_.AddPoint(1.0, 0.0);

  emitter.colourSpline_.AddPoint(0.0, new THREE.Color(0x888888));
  emitter.colourSpline_.AddPoint(1.0, new THREE.Color(0x888888));

  emitter.sizeSpline_.AddPoint(0.0, 1.0);
  emitter.sizeSpline_.AddPoint(0.25, 2.0);
  emitter.sizeSpline_.AddPoint(0.75, 4.0);
  emitter.sizeSpline_.AddPoint(1.0, 2.0);
  emitter.SetEmissionRate(25);
  emitter.SetLife(800.0);
  emitter.blend_ = 1.0;
}

let fire1Emitter = new ParticleEmitter()
let fire2Emitter = new ParticleEmitter()
let fire3Emitter = new ParticleEmitter()
setEmitter(fire1Emitter)
setEmitter(fire2Emitter)
setEmitter(fire3Emitter)
fire1Emitter.offset = group1.position 
fire2Emitter.offset = group2.position 
fire3Emitter.offset = group3.position 
fire1Emitter.AddParticles(15, group1.position);
fire2Emitter.AddParticles(15, group2.position);
fire3Emitter.AddParticles(15, group3.position);
partSystem1.AddEmitter(fire1Emitter)
partSystem2.AddEmitter(fire2Emitter)
partSystem3.AddEmitter(fire3Emitter)

guiWrap = (emitter, particleSystem, guiSystem, textureName)=>{
  let params = {
      emissionRate:25.0,
      blend:1.0,
      speed:40.0,
      lifetime:5.0,
      rotationSpeed:0.5,
      texture:textureName
  }
  let emitterChange = () =>{
      // emitter.alphaSpline_.clearPoints()
      // emitter.alphaSpline_.AddPoint(0.0, 0.2);
      // emitter.alphaSpline_.AddPoint(0.4, 1.0);
      // emitter.alphaSpline_.AddPoint(1.0, 0.0);
    
      // emitter.colourSpline_.clearPoints()
      // emitter.colourSpline_.AddPoint(0.0, new THREE.Color(0x888888));
      // emitter.colourSpline_.AddPoint(1.0, new THREE.Color(0x888888));
    
      // emitter.sizeSpline_.clearPoints()
      // emitter.sizeSpline_.AddPoint(0.0, 1.0);
      // emitter.sizeSpline_.AddPoint(0.25, 2.0);
      // emitter.sizeSpline_.AddPoint(0.75, 4.0);
      // emitter.sizeSpline_.AddPoint(1.0, 2.0);
      emitter.SetEmissionRate(params.emissionRate);
      emitter.SetLife(800.0);
      emitter.blend_ = params.blend;
      emitter.rotationSpeed = params.rotationSpeed
      emitter.speed = params.speed
      emitter.lifetime = params.lifetime
  }
  let textureChange = ()=>{
    let thisPart = particleSystem
    // really should dispose materials but they should be small
    glob = new THREE.TextureLoader().load('/static/eave/experiment/particles/'+params.texture+'.png', texture=>{
      
      thisPart.material_.uniforms.diffuseTexture.value.image = texture.image
      thisPart.material_.uniforms.diffuseTexture.value.needsUpdate=true
    })
  
  }
  guiSystem.add(params, "emissionRate", 0.0, 90.0).onChange(
    emitterChange);
  guiSystem.add(params, "blend", 0.0, 1.0).onChange(
    emitterChange);
  guiSystem.add(params, "speed", 0.0, 150.0).onChange(
    emitterChange);
  guiSystem.add(params, "lifetime", 0.0, 10.0).onChange(
    emitterChange);
  guiSystem.add(params, "rotationSpeed", 0.0, 10.0).onChange(
    emitterChange);
  guiSystem.add(params, "texture", textureNames).onChange(
    textureChange);
}
guiWrap(fire1Emitter, partSystem1, guiSystem1, initTexture1)
guiWrap(fire2Emitter, partSystem2, guiSystem2, initTexture2)
guiWrap(fire3Emitter, partSystem3, guiSystem3, initTexture3)


function render() {
	renderer.render( scene, camera );
  const time = clock.getDelta()* 0.1
  partSystem2.Update( time )
  partSystem1.Update( time )
  partSystem3.Update( time )

}


function animate() {
	renderer.setAnimationLoop( render );
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:1rem;`;

document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
function getXRSessionInit( mode, options) {
	if ( options && options.referenceSpaceType ) {
		renderer.xr.setReferenceSpaceType( options.referenceSpaceType );
	}
	var space = (options || {}).referenceSpaceType || 'local-floor';
	var sessionInit = (options && options.sessionInit) || {};

	// Nothing to do for default features.
	if ( space == 'viewer' )
		return sessionInit;
	if ( space == 'local' && mode.startsWith('immersive' ) )
		return sessionInit;

	// If the user already specified the space as an optional or required feature, don't do anything.
	if ( sessionInit.optionalFeatures && sessionInit.optionalFeatures.includes(space) )
		return sessionInit;
	if ( sessionInit.requiredFeatures && sessionInit.requiredFeatures.includes(space) )
		return sessionInit;

	var newInit = Object.assign( {}, sessionInit );
	newInit.requiredFeatures = [ space ];
	if ( sessionInit.requiredFeatures ) {
		newInit.requiredFeatures = newInit.requiredFeatures.concat( sessionInit.requiredFeatures );
	}
	return newInit;
}


function AR(){
	var currentSession = null;
	function onSessionStarted( session ) {

		session.addEventListener( 'end', onSessionEnded );

		renderer.xr.setSession( session );
		button.style.display = 'none';
		button.textContent = 'EXIT AR';

		currentSession = session;

	}
	function onSessionEnded( /*event*/ ) {

		currentSession.removeEventListener( 'end', onSessionEnded );

		renderer.xr.setSession( null );
		button.textContent = 'ENTER AR' ;

		currentSession = null;

	}
	if ( currentSession === null ) {
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: {
				optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
				domOverlay: {root: document.body}
			}
		});
		navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );

	} else {

		currentSession.end();

	}
	renderer.xr.addEventListener('sessionstart',
		function(ev) {
			console.log('sessionstart', ev);
			document.body.style.backgroundColor = 'rgba(0, 0, 0, 0)';
			renderer.domElement.style.display = 'none';
		});
	renderer.xr.addEventListener('sessionend',
		function(ev) {
			console.log('sessionend', ev);
			document.body.style.backgroundColor = '';
			renderer.domElement.style.display = '';
		});

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	renderer.setAnimationLoop( render );
}

