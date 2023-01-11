let scene, uniforms, renderer, light, camera, gl, shaderMaterial, scaleGeo, whratio,lightProbe, xrLightProbe, reflectionChanged; 
// XR globals.
let xrButton = null;
let xrRefSpace = null;
let captureNext = false 
var button = document.createElement( 'button' );

scene = new THREE.Scene();
scene.position.y = -0.4
camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 50 );
let scale = 2
var loader = new THREE.GLTFLoader()

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
let mazeObj;
function init(){
    const settings = {
        width: 10,
        height: 10,
        wallSize: 5,
        removeWalls: 0,
        entryType: 'diagonal',
        bias: '',
        color: '#000000',
        backgroudColor: '#FFFFFF',
        solveColor: '#cc3737',

        // restrictions
        maxMaze: 0,
        maxCanvas: 0,
        maxCanvasDimension: 0,
        maxSolve: 0,
        maxWallsRemove: 300,
    }
    mazeObj = new Maze(settings)
    mazeObj.generate();
    let maze = mazeObj.matrix
    row_count = maze.length
	const gateEntry = getEntryNode(mazeObj.entryNodes, 'start', true);
	const gateExit = getEntryNode(mazeObj.entryNodes, 'end', true);
    for (let i = -1; i < row_count-1; i++) {
		let row_length = maze[i+1].length;
		for (let j = 0; j < row_length; j++) {
			if (gateEntry && gateExit) {
				if ((j === gateEntry.x) && (i+1 === gateEntry.y)) {
					continue;
				}
				if ((j === gateExit.x) && (i+1 === gateExit.y)) {
					continue;
				}
			}
			let pixel = parseInt(maze[i+1].charAt(j), 10);
			if (pixel) {
          let newBrick = brickArray[parseInt(Math.random()*4)].clone()
          newBrick.position.x = -i * scale
          newBrick.position.z = -j * scale
          newBrick.position.y = 0 
          
          scene.add(newBrick)
      }else{
          let newCeiling = ceilingArray[parseInt(Math.random()*2)].clone()
          let newFlooring = floorArray[parseInt(Math.random()*2)].clone()

          newCeiling.position.x = -i * scale
          newCeiling.position.z = -j * scale
          newCeiling.position.y = scale

          newFlooring.position.x = -i * scale
          newFlooring.position.z = -j * scale 
          newFlooring.position.y = -scale

          scene.add(newFlooring)
          scene.add(newCeiling)
      }
		}
	}

const light = new THREE.PointLight( 0xff9966, 3.5, 5 );
light.position.set( 0, 0, 0 );
camera.add( light );
scene.add(camera)

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

// atrocious coding to avoid dealing with async problems
  button.id = 'ArButton'
  button.textContent = 'ENTER AR' ;
  button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;

  document.body.appendChild(button)
  document.getElementById('ArButton').addEventListener('click',x=>AR())
   
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
        // light probe mosty washes out scene
        lightProbe.intensity = 0.3;

        const intensityScalar = 
          Math.max(1.0,
          Math.max(estimate.primaryLightIntensity.x,
          Math.max(estimate.primaryLightIntensity.y,
                   estimate.primaryLightIntensity.z)));

        directionalLight.color.setRGB(
          estimate.primaryLightIntensity.x / intensityScalar,
          estimate.primaryLightIntensity.y / intensityScalar,
          estimate.primaryLightIntensity.z / intensityScalar);


        directionalLight.intensity = 0.1;
        // this gives real time light estimation
        // directionalLight.intensity = intensityScalar;
        directionalLight.position.copy(estimate.primaryLightDirection);

      } else {
        console.log("light estimate not available");
      }
	  }
    //   if (ctx.reflectionChanged) {
    //     const cubeMap = ctx.glBinding.getReflectionCubeMap(ctx.xrLightProbe);
    //     if (cubeMap) {
    //       let rendererProps = ctx.renderer.properties.get(ctx.threeEnvMap);
    //       rendererProps.__webglTexture = cubeMap;
    //     } else {
    //       console.log("Cube map not available");
    //     }
    //     ctx.reflectionChanged = false;
    //   }
    }
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

loader.load( '../data/bricks.glb', function ( gltf ) {
  gls = gltf
  let children = gltf.scene.children
  brickArray = []
  floorArray = []
  ceilingArray = []
  for(child of children){
    if(child.name.includes('wall')){
      brickArray.push(child)
    }
    if(child.name.includes('floor')){
      floorArray.push(child)
    }
    if(child.name.includes('roof')){
      ceilingArray.push(child)
    }
  }
  gltf.scene.position.z = 0;
  gltf.scene.position.x = 0;
  gltf.scene.rotation.z = 0;
  init()
  render()
} );

function render() {
	renderer.render( scene, camera );
}
