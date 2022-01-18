var camera, scene, renderer, action, clock, mixer;
txt='';
clock = new THREE.Clock()
textFile = null;
recordingFlag=false, animatingFlag=false;
button =document.getElementById('ArButton');
euler = new THREE.Euler(0,0,0,'XYZ')
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
	loader.load( 'data/scene.gltf', function ( gltf ) {
		gltf.scene.scale.z = .25
		gltf.scene.scale.y = .25
		gltf.scene.scale.x = .25
		gltf.scene.position.y = -0.3;
		mixer = new THREE.AnimationMixer( gltf.scene );
        
		action = mixer.clipAction( gltf.animations[ 0 ] );
		action.play();

		scene.add( gltf.scene );
	} );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );
}
function AR(){
	var currentSession = null;
	function onSessionStarted( session ) {
		session.addEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( session );
		button.style.display = 'none';
		button.textContent = 'exit AR';
		currentSession = session;
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
function render() {
	if(recordingFlag){//this is lazy and poor form
		txt+=`${euler.setFromQuaternion(camera.quaternion).toArray()};${camera.position.toArray()};${Date.now()}|`
	}
	if(animatingFlag){
		// sceneUpdates.
		var delta = clock.getDelta();
		if ( mixer ) mixer.update( delta );
	}
	renderer.render( scene, camera );
}
init();
animate();

document.getElementById('animate').addEventListener('change',x=>{
	animatingFlag = document.getElementById('animate').checked;
})
document.getElementById('record').addEventListener('change',x=>{
	recordingFlag = document.getElementById('record').checked;
})

document.getElementById('ArButton').addEventListener('click',x=>AR())

document.getElementById('DownloadCamera').addEventListener('click',x=>{
	data = new Blob([txt], {type:'text/plain'})
	if (textFile !== null) {
		window.URL.revokeObjectURL(textFile);
	}
	textFile = URL.createObjectURL(data);
	var a = document.createElement("a")
    a.href = textFile;
    a.download = `camera${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(textFile);  
    }, 0); 
	txt = ''
})
