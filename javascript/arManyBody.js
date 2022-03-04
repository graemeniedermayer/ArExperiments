var camera, scene, renderer;
var attractor, light;
var controls;
var room = {}; // so that 'room.visible' can be set even if room isn't loaded yet

init();
animate();

var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:1rem;`;

document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
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


function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	light = new THREE.PointLight( 0xffffff, 1 );
	light.distance = 2;
	var material = new THREE.MeshBasicMaterial( { color: "rgb(100, 100, 250)"} );
	var particles = snap[18].length-1;
	var geometry = new THREE.BufferGeometry();
	var positions = new Float32Array( particles * 3 );
	var colors = new Float32Array( particles * 3 );
	var sizes = new Float32Array( particles );
	for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3 ) {
		positions[ i3 + 0 ] = snap[18][ i ][ 0 ]/10000 - 5;
		positions[ i3 + 1 ] = snap[18][ i ][ 1 ]/10000 - 5;
		positions[ i3 + 2 ] = snap[18][ i ][ 2 ]/10000 - 5;
		colors[ i3 + 0 ] = 0.6;
		colors[ i3 + 1 ] = 0.9;
		colors[ i3 + 2 ] = 0.9;
		sizes[ i ] = 0.01;
	}
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
	geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
	var baseColor = new THREE.Color(0xffffff );
	var texture = new THREE.TextureLoader().load( '../data/circle5.png' );
	// Sprites
	var uniforms = {
		color:     { value: baseColor },
		texture:   { value: texture }
	};
	var shaderMaterial = new THREE.ShaderMaterial( {
		uniforms:       uniforms,
		vertexShader:  document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		depthTest:   true,
		transparent:   true,
		opacity: 0.5,
		depthWrite: true,
	});
	var particleSystem = new THREE.Points( geometry, shaderMaterial );
	scene.add( particleSystem );
    var ambient = new THREE.AmbientLight( 0x222222 );
    scene.add( ambient );
    var directionalLight = new THREE.DirectionalLight( 0xdddddd, 1 );
    directionalLight.position.set( 0.9, 1, 0.2 ).normalize();
    scene.add( directionalLight );
    var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 0.2 );
    directionalLight2.position.set( -0.9, -1, -0.2 ).normalize();
    scene.add( directionalLight2 );

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
		button.style.display = 'none';
		button.textContent = 'EXIT AR';

		currentSession = session;

	}
	function onSessionEnded( /*event*/ ) {

		currentSession.removeEventListener( 'end', onSessionEnded );

		renderer.xr.setSession( null );
		button.textContent = 'ENTER AR' ;

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
	renderer.render( scene, camera );
}
