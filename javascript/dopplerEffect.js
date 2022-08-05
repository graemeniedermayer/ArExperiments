let scene, uniforms, renderer, camera, camBinding, gl, texture1, shaderMaterial, scaleGeo, whratio, glBinding, dcamera, shaderProgram; 
      // XR globals.
      let xrButton = null;
      let xrRefSpace = null;
let captureNext = false;
let sigmoidFact = 2.0;
let clock = new THREE.Clock()
velMax = 0.5
first = true
distanceToCamera =-1.25
let lastPos = new THREE.Vector3()

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
function init(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 10 );
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  // renderer.gammaOutput = true;
  document.body.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );

}


function AR(){
	var currentSession = null;
	function onSessionStarted( session ) {
		session.addEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( session );
		gl = renderer.getContext()
		gl.makeXRCompatible().then(x=>{
			// could lead to race condition
			glBinding = new XRWebGLBinding(session, gl);
		})
		button.style.display = 'none';
		button.textContent = 'EXIT AR';
		currentSession = session;
		session.requestReferenceSpace('local').then((refSpace) => {
          xrRefSpace = refSpace;
          session.requestAnimationFrame(onXRFrame);
        });
	}
	function onSessionEnded( /*event*/ ) {
		currentSession.removeEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( null );
		button.textContent = 'ENTER AR' ;
		currentSession = null;
	}
	if ( currentSession === null ) {

        let options = {
          requiredFeatures: ['dom-overlay', 'camera-access'],
          domOverlay: { root: document.body }
        };
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: options
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
count = 0
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
let cartesianToSpherical = (x,y,z) => {
    let r = Math.sqrt(x**2+y**2+z**2)
    let theta = Math.atan2(y,x)
    let phi = Math.acos(z/ r)
    return [r, theta, phi]
}
let sphereToCartesian = ( r, theta, phi) => {
	let x= r * Math.sin(phi)* Math.cos(theta)
	let z= r * Math.sin(phi)* Math.sin(theta)
	let y= r * Math.cos(phi)
    return [x, y, z]
}

function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
			if (view.camera && first){
				first = false
				whratio = window.innerWidth / window.innerHeight
				// check this?
				scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(2*360) )
				const geometry = new THREE.PlaneGeometry(scaleGeo*whratio,  scaleGeo, window.innerHeight,  window.innerWidth);
				clock.start()
				lastPos = new THREE.Vector3().copy(camera.position)
				mesh = new THREE.Mesh( geometry, new THREE.ShaderMaterial( { 
					uniforms : {
						dir: {value: new THREE.Matrix3()},
						vel: {value: 0.5},
						uSampler: {value:  new THREE.Texture(camBinding) },
						velocity: {value: new THREE.Vector3()},
						coordTrans: {value:{
							x:1/viewport.width,
							y:1/viewport.height
						}},
						geoTrans: {value:{
							x:scaleGeo*whratio,
							y:scaleGeo
						}}
					},
					vertexShader:  document.getElementById( 'vertexShader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				} )
				);
				mesh.quaternion.copy(camera.quaternion)
				mesh.position.copy(camera.position)
				mesh.rotateZ(3*Math.PI/2)
				scene.add( mesh );
			}else if (view.camera ) {
				velocity = ( ( lastPos.sub(camera.position ) ).multiplyScalar(1/(velMax*clock.getDelta())) )
				let [r, theta, phi] = cartesianToSpherical(...velocity.toArray())
				r = 2/(1+Math.E**(-r*sigmoidFact))-1
				velocity = new THREE.Vector3( ...sphereToCartesian(r,theta,phi) )
				lastPos = camera.position.clone();
				mesh.material.uniforms.dir.value = new THREE.Matrix3().getNormalMatrix( new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion) )
				mesh.material.uniforms.vel.value = velocity.length()
				mesh.material.uniforms.velocity.value = velocity
				mesh.material.uniformsNeedUpdate=true
				// make a standard
  				mesh.quaternion.copy(camera.quaternion)
  				mesh.position.copy(camera.position.clone()
				  .add(new THREE.Vector3(0,0,distanceToCamera)
				  	.applyQuaternion(camera.quaternion)
				  )
				)
				  
			} else {
              console.log('unavailable')
			}
        }
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
init()
render()
function render() {
	renderer.render( scene, camera );
}

var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
