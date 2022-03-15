let scene, uniforms, renderer, light, camera, gl, shaderMaterial, scaleGeo, whratio,lightProbe, xrLightProbe, reflectionChanged; 
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
 
	const geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
  let cube = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { color:'rgba(100,200,100,1)'} ) );
  
	var loader = new THREE.GLTFLoader()
	loader.load( '../data/grainElevator.gltf', function ( gltf ) {
		gltf.scene.scale.z = 1
		gltf.scene.scale.y = 1
		gltf.scene.scale.x = 1
		scene.add( gltf.scene );
		let oldRoom = room;
		room = gltf.scene;
		// propagate old visibility, if any
		if ('visible' in oldRoom) room.visible = oldRoom.visible;
		room.position.y = -0.3;
		//room.rotation.y = Math.PI / 2;
	} );

  lightProbe = new THREE.LightProbe();
  lightProbe.intensity = 0;
  lightProbe.castShadow = true;
  scene.add(lightProbe);
  directionalLight = new THREE.DirectionalLight();
  directionalLight.intensity = 0;
  lightProbe.castShadow = true;
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
          // if (document.getElementById('useRGBA').checked) {
          //   session.requestLightProbe({reflectionFormat: "rgba16f"}).then((lightProbe) => {
          //     onReceivedLightProbe(ctx, lightProbe);
          //   }).catch(err => console.error(err));
          // } else {
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
		button.textContent = 'ENTER AR' ;
		currentSession = null;
	}
	if ( currentSession === null ) {

        let options = {
          requiredFeatures: ['dom-overlay','local', 'light-estimation'],
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
      if(xrLightProbe){
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

      // if (ctx.reflectionChanged) {
      //   const cubeMap = ctx.glBinding.getReflectionCubeMap(ctx.xrLightProbe);
      //   if (cubeMap) {
      //     let rendererProps = ctx.renderer.properties.get(ctx.threeEnvMap);
      //     rendererProps.__webglTexture = cubeMap;
      //   } else {
      //     console.log("Cube map not available");
      //   }
      //   ctx.reflectionChanged = false;
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
   
