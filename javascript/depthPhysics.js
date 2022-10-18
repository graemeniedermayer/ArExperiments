let scene, uniforms, renderer, light, camera, gl, shaderMaterial, scaleGeo, whratio; 
let xrRefSpace = null;
let captureNext = false 
meshes = new THREE.Group()

if(window.Worker){
	let lockWorker = false
	physicsWorker = new Worker('../javascript/depthPhysicsAmmoWorker.js');
	physicsWorker.onmessage = function(e) {
		if(e.data.type=='update'){
			let {objects}=e.data
			for(let index in objects){
				meshes.children[index].position.fromArray(objects[index].pos )
				meshes.children[index].quaternion.fromArray(objects[index].quat )
			}
		}
	}
}


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
  scene.add(meshes)
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
		button.style.display = 'none';
		button.textContent = 'EXIT AR';
		currentSession = session;
		session.requestReferenceSpace('local').then((refSpace) => {
          xrRefSpace = refSpace;
		  renderer.domElement.style.opacity = '0'
		  renderer.domElement.style.width = '100%'
		  renderer.domElement.style.height = '100%'
		  renderer.domElement.style.display = 'block'
          session.requestAnimationFrame(onXRFrame);
        });
	}
	function onSessionEnded( /*event*/ ) {
		currentSession.removeEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( null );
		button.textContent = 'ENTER AR' ;
		currentSession = null;
	}
	function onSessionCatch(error){
		let errorEle = document.getElementById('errorMessage')
		if(!errorEle){
			errorEle = document.createElement( 'div' );
			errorEle.id = 'errorMessage'
			errorEle.innerHTML = error.message ;
			errorEle.style.cssText+= `position: absolute;top:1rem;left:1rem;width:auto;height:auto;background:black;color:white;`;
			document.body.appendChild(errorEle)
		}else{
			errorEle.innerHTML += '<br>'+ error.message ;
		}
		console.error(error)
	}
	if ( currentSession === null ) {

        let options = {
          requiredFeatures: ['depth-sensing', 'dom-overlay'],
          domOverlay: { root: document.body },
		  depthSensing: {
		    usagePreference: [ "cpu-optimized"],
		    dataFormatPreference: [ "luminance-alpha"]
		  }
        };
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: options
		});
		navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted ).catch(onSessionCatch);
	} else {
		currentSession.end();
	}
	renderer.xr.addEventListener('sessionstart',
		function(ev) {
			console.log('sessionstart', ev);
			document.body.style.backgroundColor = 'rgba(0, 0, 0, 0)';
		});
	renderer.xr.addEventListener('sessionend',
		function(ev) {
			console.log('sessionend', ev);
			document.body.style.backgroundColor = '';
		});
}

count = 0
lerp = (a, b, x)=> (1-t)*a+b*t
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
			//update every few seconds?
            if (depthData && captureNext) {
                captureNext = false
		scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(2*360) )
		whratio = viewport.width/viewport.height
                const geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, depthData.width-1, depthData.height-1);
		const vertices = geometry.attributes.position.array;
		let data = new Uint8Array(depthData.data)
		let convRate = depthData.rawValueToMeters
		let depthMap = new  Float32Array(data.length/2)
		boundingBox = {'top':-Infinity,'bottom':Infinity, 'left':Infinity, 'right':-Infinity}
		// this is a mess.
		for ( let  j = 0, k = 0, i = 0, l = data.length; j < l; j+=2, k+=3) {
			zdistance = convRate*(data[ i ]+data[ i+1 ]*255)
			vertices[ k ] = vertices[ k ]*zdistance;
			vertices[ k + 1 ] = vertices[ k + 1 ]*zdistance ;
			vertices[ k + 2 ] =  - zdistance ;
			i+= 2
		}
		mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { color:'rgba(100,200,100,0.2)'} ) );
				
		mesh.quaternion.copy(camera.quaternion)
		mesh.position.copy(camera.position)
		mesh.rotateZ(3*Math.PI/2)
		mesh.material.wireframe = true
		scene.add( mesh );//This line can be removed to disable the rendering of the mesh.
		physicsWorker.postMessage({
			'type':'initMap',
			'map':{
				'positions':vertices,
				'index': geometry.index.array,
				'matrixWorld': mesh.matrixWorld,
				'threeVec': new THREE.Vector3(),//I don't want to import all of threejs into the worker
				'height':depthData.height,
				'width':depthData.width,
				'pos':mesh.position.toArray(),
				'rot':mesh.quaternion.toArray()
			}
		})
// 		    to simplify the mesh before using it.
		    // const modifier = new THREE.SimplifyModifier();
				// const simplified = mesh.clone();
				// simplified.material = simplified.material.clone();
				// simplified.material.wireframe = true
				// const count = Math.floor( simplified.geometry.attributes.position.count * Number(document.getElementById('value').value) ); // number of vertices to remove
				// simplified.geometry = modifier.modify( simplified.geometry, count );
				// scene.add( simplified );
				// // scene.add( mesh );
				// physicsWorker.postMessage({
				// 	'type':'initMap',
				// 	'map':{
				// 		'positions':simplified.geometry.attributes.position.array,
				// 		'index': simplified.geometry.index.array,
				// 		'matrixWorld': simplified.matrixWorld,
				// 		'threeVec': new THREE.Vector3(),//I don't want to import all of threejs into the worker
				// 		'height':depthData.height,
				// 		'width':depthData.width,
				// 		'pos':simplified.position.toArray(),
				// 		'rot':simplified.quaternion.toArray()
				// 	}
				// })
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

// new raycaster
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

isSphere = true
function raycasterFunction( event) {
	mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	let ray = raycaster.ray
	let origin = ray.origin.add(ray.direction.multiplyScalar(0.2))
	if(isSphere){
		size = 0.1
		isSphere = !isSphere
		let ballGeometry = new THREE.SphereGeometry( size, 32, 16 );
		let ballMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color(`hsl(${255*Math.random()}, 100%, 77%)`) }  );
		ballSphere = new THREE.Mesh( ballGeometry, ballMaterial );
		ballSphere.position.copy(origin)
		meshes.add(ballSphere)
		physicsWorker.postMessage({
			'type':'addSphere',
			'pos':origin,
			'vel':ray.direction.clone().multiplyScalar(40),
			'size':size
		})
	}else{
		size = 0.1
		isSphere = !isSphere
		let boxGeometry = new THREE.BoxGeometry( size, size, size, 1, 1, 1 );
		let boxMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color(`hsl(${255*Math.random()}, 100%, 77%)`) }  );
		boxSphere = new THREE.Mesh( boxGeometry, boxMaterial );
		boxSphere.position.copy(origin)
		meshes.add(boxSphere)
		physicsWorker.postMessage({
			'type':'addCube',
			'pos':origin,
			'vel':ray.direction.clone().multiplyScalar(40),
			'size':size
		})

	}
	return raycaster.ray
}
var onMouseStart = (e)=>{
	e.preventDefault()
	let ray = raycasterFunction(e)
}
var onTouchStart = (e)=>{
	e.preventDefault()
	for( var j = 0; j < e.touches.length; j++ ) {
		let ray = raycasterFunction(e.touches[ j ])
	}
}

renderer.domElement.addEventListener( 'mousedown', onMouseStart ,false);
renderer.domElement.addEventListener( 'touchstart', onTouchStart ,false);
