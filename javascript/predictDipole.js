let scene, uniforms, renderer, light, camera, shaderMaterial; 
// XR globals.

let magneticScale = 0.0000001 //needs to be a small number
let magneticMoment = new THREE.Vector3(0.0000001,0.0000001,0.0000001) //needs to be a small number
let magneticPosition = new THREE.Vector3(0,0,0)
let dipoleObj;
let error = new THREE.Vector3(0,0,0);
let captureBackgroundFlag = false;
let useGradDescent = false;
let xrRefSpace = null;
let recordValues = false 
let magSensor = new Magnetometer({frequency: 10}); //60 hertz might be too much..
let magneticBackground = new THREE.Vector3(0,0,0)
let backgroundCount = 0;
let predictionVals = []
let newPredictions = false
let predictedAv = new THREE.Vector3()
let recorded = []
let measures = []


setupMagSensor = ()=>{
	magSensor.addEventListener('reading', e => {
	  if(measures.length>800){
			measures = []
			for( var i = scene.children.length - 1; i >= 0; i--) { 
			     obj = scene.children[i];
			     scene.remove(obj); 
			}
		}
      let localMeasure= new THREE.Vector3(
          magSensor.x,
          magSensor.y,
          magSensor.z
      )
      var targetQuaternion = camera.quaternion.clone()
	  let magField = localMeasure.applyQuaternion(targetQuaternion)
      let color = 0xffff00
	  if(captureBackgroundFlag){
	  	backgroundCount+=1
        magneticBackground.multiplyScalar(
            backgroundCount/(backgroundCount+1)
        ).add(magField.clone().multiplyScalar(1/(1+backgroundCount)))
        magneticMoment = magneticBackground.clone().multiplyScalar(0.005)      
        color = 0x00ffff
	  }else{
        magField.sub(magneticBackground)
      }
      if(recordValues){
        newPredictions = true
        recorded.push([camera.position.clone(),  magField])
        color = 0xff00ff
      }
      let magLength = Math.sqrt(magField.x**2+magField.y**2+magField.z**2)/1000//this might be very long
      let arr = new THREE.ArrowHelper( magField.clone().normalize(), camera.position.clone(), magLength, color );
	  scene.add(arr)
      measures.push(magField)
    });
    magSensor.start();
}

parameterizeMagField = (originOfExpectedMagnet, expectedMoment)=>{
    return (measuredPosition, measuredMagneticField = new THREE.Vector3(0,0,0) )=>{
        let radius = measuredPosition.clone().sub(originOfExpectedMagnet)
        let radLength = radius.length()
        let magneticMoment = expectedMoment.clone()
        // theory - measured = 0 (This should be zero if correct)
        return (
                radius.clone().multiplyScalar(
                    magneticMoment.dot(radius)*3/radLength**5
                ).sub(
                    magneticMoment.clone().multiplyScalar(1/radLength**3)
                )
            ).sub(measuredMagneticField)
    }
}

magneticField = (radius, moment)=>{
    let radLength = radius.length()
    return (
        radius.clone().multiplyScalar(moment.dot(radius)*3/radLength**5)
        ).sub(moment.clone().multiplyScalar(1/radLength**3))
}
difH = 0.000001
learningRate = 0.01
xaxis = new THREE.Vector3(1,0,0)
yaxis = new THREE.Vector3(0,1,0)
zaxis = new THREE.Vector3(0,0,1)
// Newton's method might be better (doesn't work)
// but grad descent is super interpretable.

let sphereToCartesian = ( r, theta, phi) => {
    let x= r * Math.sin(phi)* Math.cos(theta)
    let y= r * Math.sin(phi)* Math.sin(theta)
    let z= r * Math.cos(phi)
    return [x, y, z]
}
let initLines = (magneticPosition, magneticMoment)=>{
    sizeOfLines = 4000
    scaling = 1
    sizeOfSphere = 0.05
    let lineQuat = (new THREE.Quaternion()).setFromUnitVectors(new THREE.Vector3(0,0,1), magneticMoment.clone().normalize())

    startingLocations = []
    for(let phi=0; phi< Math.PI/4; phi+= Math.PI/(4*5)){
        for(let theta =0; theta<Math.PI*2; theta+=Math.PI/4){
            startingLocations.push( 
                (new THREE.Vector3(...sphereToCartesian( sizeOfSphere, theta, phi))
                ).applyQuaternion(lineQuat).add(magneticPosition) 
            )
        }
    }

    // calculate lines
    calLines = []
    segmentationLength = 0.005 //.5cm?
    for(let startingLocation of startingLocations){
        let lines = []
        let lastValue = startingLocation
        let magField = parameterizeMagField(magneticPosition, magneticMoment)
        for(let i =0; i<sizeOfLines; i++){
            // radius
            lines.push(lastValue)
            lastValue = lastValue.clone().add(
                magField(lastValue).normalize().multiplyScalar(segmentationLength)
            )
            if(lastValue.clone().sub(magneticPosition).length()<sizeOfSphere){
                break
            }
        }
        calLines.push(lines)
    }
    var lineNum = sizeOfLines*startingLocations.length;
    let positions = new Float32Array(lineNum * 6);
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial( {
        color: 0xaaaaff,
        linewidth: 1,
    } );
    
    if(dipoleObj){
        dipoleObj.geometry.dispose()
        dipoleObj.material.dispose()
        scene.remove(dipoleObj)
    }
    dipoleObj = new THREE.LineSegments(geometry, material);
    
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
    dipoleObj.geometry.setDrawRange(0, 2 * lastLineCount);
    // dipoleObj.geometry.translate(...magneticPosition.toArray());
    scene.add(dipoleObj);
}
moveLines = (newPos)=>{
    dipoleObj.position.copy(newPos)
}
// move object
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
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  // renderer.gammaOutput = true;
  document.body.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );
}

if(window.Worker){
	let lockWorker = false
	strategyWorker = new Worker('/static/eave/experiment/predictDipoleWorker.js');
    gradDescent = (position, moment,results)=>{
        // if objects are too heavy?
        if(!lockWorker){
            lockWorker = true
            console.log('ok')
            strategyWorker.postMessage({
                'data': [position, moment, results],
            })
        }
    }
	strategyWorker.onmessage = function(e) {
		let data = e.data.data;
        magneticPosition.copy(data[0])
        magneticMoment.copy(data[1])
        error.copy(data[2])
        moveLines(magneticPosition)
        lockWorker = false
	}
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
          setupMagSensor()
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
          requiredFeatures: [ 'dom-overlay'],
          domOverlay: { root: document.body },
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
            if(useGradDescent){
                if(newPredictions){
                    newPredictions = false
                    predictedAv = new THREE.Vector3()
                    recorded.forEach(element => {
                        predictedAv.add(element[0])
                    });
                    predictedAv.multiplyScalar(1/recorded.length)
                    magneticPosition = predictedAv.clone()
                    initLines(magneticPosition, magneticMoment)
                }

                    gradDescent(magneticPosition,magneticMoment,recorded)
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
      
document.getElementById('gradDescent').addEventListener('touchstart',()=>{
	useGradDescent = true;
})
document.getElementById('gradDescent').addEventListener('touchend',()=>{
	useGradDescent = false;
})
document.getElementById('captureValues').addEventListener('touchstart',()=>{
	recordValues = true;
})
document.getElementById('captureValues').addEventListener('touchend',()=>{
	recordValues = false;
})
document.getElementById('captureBackground').addEventListener('touchstart', ()=>{
	captureBackgroundFlag =true
})
document.getElementById('captureBackground').addEventListener('touchend', ()=>{
	captureBackgroundFlag =false
})
