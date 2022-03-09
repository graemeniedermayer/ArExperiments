let scene, uniforms, renderer, light, camera, shaderMaterial; 
// XR globals.
let xrButton = null;
let xrRefSpace = null;
let captureNext = false 


let initLines = ()=>{
magneticMoment = new THREE.Vector3(0,1,0)
magneticPosition = new THREE.Vector3(0,0,0)
sizeOfLines = 4000
scaling = 1
sizeOfSphere = 0.05

magneticPotential = (radius)=>{
    return magneticMoment.clone().cross(radius).multiplyScalar(scaling*radius.length())
}
magneticField = (radius)=>{
    radLength = radius.length()
    return (radius.clone().multiplyScalar(magneticMoment.dot(radius)*3/radLength**5)).sub(magneticMoment.clone().multiplyScalar(1/radLength**3))
}

let cartesianToSpherical = (x,y,z) => {
    let r = Math.sqrt(x**2+y**2+z**2)
    let theta = Math.atan2(y,x)
    let phi = Math.acos(z/ r)
    return [r, theta, phi]
}
let sphereToCartesian = ( r, theta, phi) => {
	let x= r * Math.sin(phi)* Math.cos(theta)
	let z= r * Math.sin(phi)* Math.sin(theta)
	let y= r * Math.cos(phi)
    return [x, y, z]
}


startingLocations = []
for(let phi=0; phi< Math.PI/4; phi+= Math.PI/(4*5)){
    for(let theta =0; theta<Math.PI*2; theta+=Math.PI/4){
        startingLocations.push(new THREE.Vector3(...sphereToCartesian( sizeOfSphere, theta, phi)))
    }
}

// calculate lines
calLines = []
segmentationLength = 0.01 //.5cm?
for(let startingLocation of startingLocations){
    let lines = []
    let lastValue = startingLocation
    for(let i =0; i<sizeOfLines; i++){
        // radius
        lines.push(lastValue)
		// lastValue = lastValue.clone().add(new THREE.Vector3(0,0.001,0))
        lastValue = lastValue.clone().add(magneticField(lastValue).normalize().multiplyScalar(segmentationLength))
        if(lastValue.length()<sizeOfSphere){
            break
        }
    }
    calLines.push(lines)
}

// draw lines
var lineNum = sizeOfLines*startingLocations.length;
let positions = new Float32Array(lineNum * 6);
var geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.LineBasicMaterial( {
	color: 0xaaaaff,
	linewidth: 1,
} );

let system = new THREE.LineSegments(geometry, material);

lastLineCount = 0
for(let lines of calLines){
    let i = 0;
    for (i = 0; i < lines.length-1; i++) {
        var point1 = lines[i];
        var point2 = lines[i+1];
        positions.set([...point1.toArray(), ...point2.toArray()], 6 * (lastLineCount + i));
    }
    lastLineCount += i+1
}
system.geometry.setDrawRange(0, 2 * lastLineCount);
system.position.set(0,0,-1)
scene.add(system)
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
  initLines()
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
          session.requestAnimationFrame(onXRFrame);
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
          requiredFeatures: ['depth-sensing', 'dom-overlay'],
          domOverlay: { root: document.body },
		  depthSensing: {
		    usagePreference: ["gpu-optimized", "cpu-optimized"],
		    dataFormatPreference: ["float32", "luminance-alpha"]
		  }
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

count = 0
function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {
		for (const view of pose.views) {
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
