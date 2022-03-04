let scene, uniforms, renderer, light, camera, gl, currentSession, shaderMaterial, scaleGeo, whratio, baseLayer, video, context, pixels; 
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
  let scaleGeo = Math.sin( 2*Math.PI*camera.fov/(2*360) )
  let whratio = window.innerWidth / window.innerHeight
  const geometry = new THREE.PlaneGeometry( scaleGeo*whratio, scaleGeo, 90, 50);
  
  mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( ) );
  mesh.quaternion.copy(camera.quaternion)
  mesh.position.copy(camera.position)
  mesh.position.add(new THREE.Vector3(0,0,-0.3).applyQuaternion(camera.quaternion))
  scene.add( mesh );
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
	currentSession = null;
	function onSessionStarted( session ) {
		session.addEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( session );
		gl = renderer.getContext()
		button.style.display = 'none';
		button.textContent = 'EXIT AR';
		currentSession = session;
		session.requestReferenceSpace('local').then((refSpace) => {
          xrRefSpace = refSpace;
          session.requestAnimationFrame(onXRFrame);
		  let canvas = document.getElementsByTagName('canvas')[0]
		  video = document.createElement('video')
		  video.id = 'userCam'
		  video.autoplay = true;
		  document.body.append(video)
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
          requiredFeatures: ['dom-overlay'],
          domOverlay: { root: document.body },
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
	function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
			if( captureNext ){
				captureNext = false 
				currentSession.end().then(x=>{
				const constraints = { video: {facingMode: 'environment' }};

				if(document.getElementsByTagName('video').length>1){
					document.body.removeChild(document.getElementsByTagName('video')[1])
				}
		  		navigator.mediaDevices.getUserMedia(constraints).then( stream => {
					 console.log(`using the webcam successfully...`);
		  			video = document.getElementById('userCam')
		  			video.srcObject = stream; 
		  			mesh.material.map = new THREE.VideoTexture(video)
					mesh.material.needsUpdate =true 

        			let options = {
        			  requiredFeatures: ['dom-overlay'],
        			  domOverlay: { root: document.body },
        			};
					var sessionInit = getXRSessionInit( 'immersive-ar', {
						mode: 'immersive-ar',
						referenceSpaceType: 'local', // 'local-floor'
						sessionInit: options
					});
					
					navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );
		  		})
				})
			}
			if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
					  
					  
				mesh.material.needsUpdate =true 
			}
        }
	}
}
}

count = 0


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
      
let captureButton = document.getElementById('captureButton').addEventListener('click',()=>{
	captureNext = true;
})
