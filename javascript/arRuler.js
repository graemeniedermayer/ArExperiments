var camera, scene, renderer;
var pos1, pos2, dif, pos1State=[[0,0,0],[1,0,0,0]], pos2State= [0,0];
pos1 = document.getElementById('pos1')
pos2 = document.getElementById('pos2')
dif =  document.getElementById('dif')
button =document.getElementById('ArButton');
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
	// update
	pos2State[0] = camera.position.toArray()
	pos2State[1] = camera.quaternion.toArray();
	pos2.innerHTML = `Position = ${pos2State[0].map(x=>x.toPrecision(3))}; Quat = ${pos2State[1].map(x=>x.toPrecision(2))}`
	renderer.render( scene, camera );
}
init();
animate();

document.getElementById('ArButton').addEventListener('click',x=>AR())

document.getElementById('Button1').addEventListener('click',x=>{
	pos1State = [...pos2State]
	pos1.innerHTML = `Position= ${pos1State[0].map(x=>x.toPrecision(3))}; Quat= ${pos1State[1].map(x=>x.toPrecision(2))}`
})

document.getElementById('Button2').addEventListener('click',x=>{
	angle = new THREE.Quaternion(...pos1State[1]).angleTo(new THREE.Quaternion(...pos2State[1]))
	pos = pos2State[0].map((x,i)=>pos1State[0][i]-x)
	dif.innerHTML = `length(m) ${Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2).toPrecision(3)}; angles(degree) ${(180*angle/Math.PI).toPrecision(3)}; position(m) ${pos.map(x=>x.toPrecision(3))}`
})
