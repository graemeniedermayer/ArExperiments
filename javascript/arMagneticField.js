var camera, scene, renderer, magnetometer;
var light;
var measures = []
var room = {}; // so that 'room.visible' does cause a crash
let magSensor = new Magnetometer({frequency: 10}); //60 hertz might be too much..
let magneticBackground = new THREE.Vector3(0,0,0)

setupMagSensor = ()=>{
	magSensor.addEventListener('reading', e => {
	  if(measures.length>800){//reset after 800 measurements
			measures = []
			for( var i = scene.children.length - 1; i >= 0; i--) { 
			     obj = scene.children[i];
			     scene.remove(obj); 
			}
			magneticBackground = new THREE.Vector3(0,0,0)
		}
      let localMeasure= new THREE.Vector3(
          magSensor.x,
          magSensor.y,
          magSensor.z
      )
      var targetQuaternion = camera.quaternion.clone()
	  let magField = localMeasure.applyQuaternion(targetQuaternion)
	  if(measures.length==77){//calibrate for background magnetic field
	  	let average = [0,0,0]
	  	for(let i=25; i<=75; i++){
			  average[0]+=measures[i].x
			  average[1]+=measures[i].y
			  average[2]+=measures[i].z
		}
		magneticBackground = new THREE.Vector3(average[0]/50,average[1]/50,average[2]/50)
	  }
	  magField.sub(magneticBackground)
      let magLength = Math.sqrt(magField.x**2+magField.y**2+magField.z**2)/1000//this might be very long
      let arr = new THREE.ArrowHelper( magField.clone().normalize(), camera.position.clone(), magLength, 0xffff00 );
	  scene.add(arr)
      measures.push(magField)
    });
    magSensor.start();
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	camera.position.x = -1
    
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	// renderer.gammaOutput = true;
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function AR(){
	var currentSession = null;
	function onSessionStarted( session ) {
		session.addEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( session );
		button.style.display = 'none';
		setupMagSensor()
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

function animate() {
	renderer.setAnimationLoop( render );
}

function render() {
	renderer.render( scene, camera );
}

init();
animate();

var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:1rem;`;

document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())

// calculated field lines.
