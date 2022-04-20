var camera, scene, renderer, action, clock, mixer;
txt='';
clock = new THREE.Clock()
textFile = null;
button =document.getElementById('ArButton');
euler = new THREE.Euler(0,0,0,'XYZ')
// create a worker.
scale = 0.2
first = true


function getXRSessionInit( mode, options) {
	if ( options && options.referenceSpaceType ) {
		renderer.xr.setReferenceSpaceType( options.referenceSpaceType );
	}
	var space = (options || {}).referenceSpaceType || 'local-floor';
	var sessionInit = (options && options.sessionInit) || {};	
	if ( space == 'viewer' )
		return sessionInit;
	if ( space == 'local' && mode.startsWith('immersive' ) )
		return sessionInit;
		
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
function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	
	var loader = new THREE.GLTFLoader()
	loader.load( '../data/abomination.gltf', function ( gltf ) {

		gltf.scene.scale.x = scale;
		gltf.scene.scale.y = scale;
		gltf.scene.scale.z = scale;
		gltf.scene.rotation.x = Math.PI/2;
		gltf.scene.position.z = -3;
		gltf.scene.position.y = -1.6
		mixer = new THREE.AnimationMixer( gltf.scene );
		action = mixer.clipAction( gltf.animations[ 0 ] );
		action.play();

		scene.add( gltf.scene );
        scene.children[2].frustumCulled=false
        scene.children[2].children[0].frustumCulled=false
        scene.children[2].children[0].children[1].frustumCulled=false

        scene.children[2].children[0].children[1].castShadow=true

		const geometry = new THREE.PlaneGeometry( 2000, 2000 );
		geometry.rotateX( - Math.PI / 2 );

		const material = new THREE.ShadowMaterial();
		material.opacity = 0.2;

		const plane = new THREE.Mesh( geometry, material );
		plane.scale.y = 20;
		plane.scale.x = 20;
		plane.scale.z = 20;
		plane.position.y = -1.6;
		plane.receiveShadow = true;
		scene.add( plane );
	} );

	lightProbe = new THREE.LightProbe();
	lightProbe.intensity = 0;
	lightProbe.castShadow = true;
	scene.add(lightProbe);
	directionalLight = new THREE.DirectionalLight();
	directionalLight.intensity = 0;
	directionalLight.castShadow = true;
	scene.add(directionalLight);
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
		button.style.display = 'none';
		button.textContent = 'EXIT AR';
		currentSession = session;
		session.requestReferenceSpace('local').then((refSpace) => {
          xrRefSpace = refSpace;
          session.requestAnimationFrame(onXRFrame);
          session.requestLightProbe().then((lightProbe) => {
              xrLightProbe = lightProbe;
              xrLightProbe.addEventListener('reflectionchange', () => reflectionChanged = true);
            }).catch(err => console.error(err));
          // }
        });
	}
	function onSessionEnded( /*event*/ ) {
		currentSession.removeEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( null );
		button.textContent = 'enter AR' ;
		currentSession = null;
	}
	if ( currentSession === null ) {
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: {
				requiredFeatures: ['dom-overlay', 'light-estimation'],
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
      if(xrLightProbe&&first){
		  first = false
        estimate = frame.getLightEstimate(xrLightProbe);
      	if (estimate) {
      	  lightProbe.sh.fromArray(estimate.sphericalHarmonicsCoefficients);
      	  lightProbe.intensity = 1;
		
      	  const intensityScalar =
      	    Math.max(1.0,
      	    Math.max(estimate.primaryLightIntensity.x,
      	    Math.max(estimate.primaryLightIntensity.y,
      	             estimate.primaryLightIntensity.z)));
			
      	  directionalLight.color.setRGB(
      	    estimate.primaryLightIntensity.x / intensityScalar,
      	    estimate.primaryLightIntensity.y / intensityScalar,
      	    estimate.primaryLightIntensity.z / intensityScalar);
			
      	  directionalLight.intensity = intensityScalar;
      	  directionalLight.position.copy(estimate.primaryLightDirection);
			
      	} else {
      	  console.log("light estimate not available");
      	}
      }
    }
	}
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function render() {
	var delta = clock.getDelta();
	if ( mixer ) mixer.update( delta );
	// move model forward?
	scene.children[2].position.z+=0.017*scale
	renderer.render( scene, camera );
}
init();

var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:1rem;`;

document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
