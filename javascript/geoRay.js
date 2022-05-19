var camera, scene, renderer, pivot;
var attractor, light, longitude, latitude, magneticRotation;
var controls;
var room = {}; // so that 'room.visible' can be set even if room isn't loaded yet
measures = []
intersectObjects = []
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

init();
animate();
rayDiv = document.getElementById('rayDiv')


let northAngle = 0
let accelVec;
height = 2;
// y is up. z is north
earthRadius =  6378137
originLong = -104.63292
originLat = 50.441383+0.00069619434
startGps = (freq = 5000)=> {
    console.log('starting GPS')
    navigator.geolocation.watchPosition( 
        position => {
            longitude = position.coords.longitude;
            latitude = position.coords.latitude
        }, error => {
            alert(`GPS listen error: code ${error}`);
        }, {
            enableHighAccuracy: true,
            maximumAge: freq
        }
    );
}

function raycasterFunction( event) {
	console.log('ray')
	mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	let intersects = []
	intersects = raycaster.intersectObjects( intersectObjects );
	return [intersects.length > 0 ? intersects[ 0 ]: undefined, raycaster.ray]
}

TOUCHSTATE = {}
var onMouseStart = (e)=>{
	console.log('okay')
	let [obj, ray] = raycasterFunction(e)
	TOUCHSTATE[ 'mouse' ] = obj
	if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
		rayDiv.innerHTML = obj.object.name
	}
	// new object
}
var onTouchStart = (e)=>{
	console.log('okay1')
	for( var j = 0; j < e.touches.length; j++ ) {
		let [obj,ray] = raycasterFunction(e.touches[ j ])
		if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
			rayDiv.innerHTML = obj.object.name
		}
	}
}


function setupSensors(){
	let magSensor = new Magnetometer({frequency: 10});
	// either this or the loading happens first
	let finalTransforms = ()=>{
		console.log('final trans')
		// translate earth raduis upwards (is this unnecessary)
		// Magnetic Rotation time delay issue? no there shouldn't be?
		// There could be a translation upwards of 6000km (earths raduis?) Does it matter?
		
		
		// locations.forEach(vec=> {
		// 	let tmp = vec.y;
		// 	vec.x = vec.x;
		// 	vec.y = vec.z;
		// 	vec.z = -tmp;
		// } )
		// swap axis
		room.position.y = -height; //maybe
		room.position.x = -earthRadius*Math.PI*(longitude - originLong)/180
		room.position.z = earthRadius*Math.PI*(latitude - originLat)/90
		try{
			// if (!pivot.rotation.y){
			// 	pivot.rotation.y = northAngle
			// }
		}catch(e){

		}
		// room.quaternion.applyMatrix4(magneticRotation)
		console.log('fin')
	}
	magSensor.addEventListener('reading', e => {//y is north
		 // save point
		let localMeasure= new THREE.Vector3(
		   magSensor.x,
		   magSensor.y,
		   magSensor.z
		)
		var targetQuaternion = camera.quaternion.clone().normalize()
		let magField = localMeasure.applyQuaternion(targetQuaternion)
		// north is calculated after 10 seconds.
		if(measures.length==51){//calibrate for background magnetic field
			console.log('cal back mag')
			let average = [0,0,0]
			let count = 0
			for(let i=25; i<=50; i++){
				  average[0]+=measures[i].x
				  average[1]+=measures[i].y
				  average[2]+=measures[i].z
				  count = i
			}
			magneticNorth = new THREE.Vector3(
				average[0]/count, 
				average[1]/count, 
				average[2]/count
			)
			
			northAngle = Math.atan2(magneticNorth.x,-magneticNorth.z)
			try{
				finalTransforms()
				magSensor.stop()
			}catch(e){

			}
		}
		measures.push(magField)
		
	});
	// acl.start();
	magSensor.start();
	startGps();//might not work...
	
}

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
	camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 1000 );
	light = new THREE.PointLight( 0xffffff, 1 );
	light.distance = 2;
    var ambient = new THREE.AmbientLight( 0x222222 );
    scene.add( ambient );
    var directionalLight = new THREE.DirectionalLight( 0xdddddd, 1 );
    directionalLight.position.set( 0.9, 1, 0.2 ).normalize();
    scene.add( directionalLight );
    var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 0.2 );
    directionalLight2.position.set( -0.9, -1, -0.2 ).normalize();
    scene.add( directionalLight2 );
	var loader = new THREE.GLTFLoader()
	loader.load( '/static/eave/data/reginaSep.gltf', function ( gltf ) {
	// orientate ourselves using gps + magnetometer
		pivot = new THREE.Object3D()
		pivot.add( gltf.scene )
		scene.add( pivot );
		let oldRoom = room;
		room = gltf.scene;
		// propagate old visibility, if any
		if ('visible' in oldRoom) room.visible = oldRoom.visible;
        // make semi transparent
		// move room
		room.position.y = -height; //maybe
		room.children[0].material.opacity = 0.6
		intersectObjects = room.children
		try{
			room.position.x = -earthRadius*Math.PI*(longitude - originLong)/180
			room.position.z = earthRadius*Math.PI*(latitude - originLat)/90
		
			// if (!pivot.rotation.y){
			// 	pivot.rotation.y = northAngle
			// }
			// room.quaternion.applyMatrix4(magneticRotation)
		}catch(e){

		}
		window.addEventListener( 'mousedown', onMouseStart ,false);
		window.addEventListener( 'touchstart', onTouchStart ,false);
		window.addEventListener( 'mousemove', onMouseStart ,false);
		window.addEventListener( 'touchmove', onTouchStart ,false);
		window.addEventListener( 'mouseup', onMouseStart ,false);
		window.addEventListener( 'touchend', onTouchStart ,false);
	} );

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
		setupSensors()
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
