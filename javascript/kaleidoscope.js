let scene, uniforms, renderer, light, camera, camBinding, gl, texture1, shaderMaterial, scaleGeo, whratio, glBinding, dcamera, shaderProgram; 
      // XR globals.
      let xrButton = null;
      let xrRefSpace = null;
let captureNext = false 

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
  // var particles = 20*10*150;
  light = new THREE.PointLight( 0xffffff,1.5 );
  light.decay = 1
  light.distance = 30;
  light.position.x = 0
  light.position.y = 1.5
  light.position.z = -1.2
  scene.add(light)
  var ambient = new THREE.AmbientLight( 0x222222 );
  scene.add( ambient );
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
          requiredFeatures: ['depth-sensing', 'dom-overlay', 'camera-access'],
          domOverlay: { root: document.body },
		  depthSensing: {
		    usagePreference: [ "cpu-optimized"],
		    dataFormatPreference: ["luminance-alpha"]
		  }
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
function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	light.position.z = -3 - 2*Math.sin(count)
	count += 0.02
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
            const depthData = frame.getDepthInformation(view); 
            if (view.camera && depthData && captureNext) {
				captureNext =false
				dcamera = view.camera
				camBinding = glBinding.getCameraImage(dcamera);

				whratio = viewport.width/viewport.height
				scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(2*360) )
                const geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, depthData.width-1, depthData.height-1);
				const vertices = geometry.attributes.position.array;
				let data = new Uint8Array(depthData.data)
				let convRate = depthData.rawValueToMeters
				for ( let  j = 0, k = 0, i = 0, l = data.length; j < l; j+=2, k+=3) {
					zdistance = convRate*(data[ i ]+data[ i+1 ]*255)
					// near frucrum is camera plane?
					vertices[ k ] = vertices[ k ]*zdistance;
					vertices[ k + 1 ] = vertices[ k + 1 ]*zdistance ;
					vertices[ k + 2 ] =  - zdistance ;
					i+= 2

				}
				mesh = new THREE.Mesh( geometry, new THREE.ShaderMaterial( { 
					uniforms : {
						uSampler: { value: new THREE.DataTexture(texture1, dcamera.width, dcamera.height) },
						coordTrans: {value:{
							x:1/viewport.width,
							y:1/viewport.height
						}}
					},
					vertexShader:  document.getElementById( 'vertexShader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				} )
				);
				mesh.quaternion.copy(camera.quaternion)
				mesh.position.copy(camera.position)
				mesh.rotateZ(3*Math.PI/2)
				// mesh.material.wireframe = true
				scene.add( mesh );
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
      
let captureButton = document.getElementById('captureMesh').addEventListener('click',()=>{
	captureNext = true;
})
