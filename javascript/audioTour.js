// WORK IN PROGRESS
var camera, scene, renderer, button;


soundsListener = [
// direction?
	{
		position:[4.3,0,-6],
		name:'../data/sound/fences.m4a',
		title:'fence',
		color:0x00ff00
	},
	{
		position:[0,0,-2.1],
		name:'../data/sound/sidewalks.m4a',
		title:'sidewalk',
		color:0xff00ff
	},
	{
		position:[-2.3,-1,-4.1],
		name:'../data/sound/lawn.m4a',
		title:'lawn',
		color:0xff0000
	},
	{
		position:[3.3,-1,-4.1],
		name:'../data/sound/garden.m4a',
		title:'garden',
		color:0x0000ff
	}
]

// Initialize the 3d scene
function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, 
		window.innerWidth / window.innerHeight, 
		0.0001, 10 );
	
	const geometry = new THREE.BoxGeometry( 0.05, 0.05, 0.05 );
	const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
	const cube = new THREE.Mesh( geometry, material );
	scene.add( cube );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild( renderer.domElement );
	listener = new THREE.AudioListener();
	camera.add(listener)
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	}
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
		
		const loader = new THREE.AudioLoader():
		for(let i = 0; i < soundsListener.length; i++ ){
			let sound = new THREE.PositionalAudio(listener)
			loader.load( soundsListener[i].name, (buffer)=>{
				setTimeout(() => {
				sound.setBuffer(buffer)
				sound.setLoop(true);
				sound.setVolume(5.5)
				sound.setRefDistance(0.002)
				sound.play()
				speakerScreen = new TextCanvas({
					string: soundsListener[i].title,
					fontsize: 300,
					loc1: soundsListener[i].position,
					loc2:[0.1,0.1,0.1],
					geotype: {'canvasDepth':0.0, 'canvasHeight':0.25, 'scaleCanvas':2.}
				})
				speakerScreen.plane.rotation.y = Math.PI
				speakerScreen.update()
				speakerScreen.plane.add(sound)
				scene.add(speakerScreen.plane)
				}, 5000);
			})
		}
	}

	function onSessionEnded( /*event*/ ) {
		currentSession.removeEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( null );
		button.style.display = 'block';
		button.textContent = 'enter AR' ;
		currentSession = null;
	}

	if ( currentSession === null ) { // This is the call that starts the session
		var sessionInit = getXRSessionInit( 'immersive-ar', { 
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: {
				optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
				domOverlay: {root: document.body}
			}
		});
		navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( 
			onSessionStarted );
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
function getXRSessionInit( mode, options) { // magic sauce
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
		newInit.requiredFeatures = newInit.requiredFeatures.concat( 
			sessionInit.requiredFeatures );
	}
	return newInit;
}
function animate() {
	renderer.setAnimationLoop( render );
}
function render() {
	renderer.render( scene, camera );
}
init(); // initialize the threejs scene
animate(); //starts renderering loop

//add the AR button 
button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:3rem;`;
document.body.appendChild(button)

document.getElementById('ArButton').addEventListener('click',x=>AR())
