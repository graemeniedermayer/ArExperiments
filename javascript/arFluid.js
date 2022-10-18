
var texture = new THREE.TextureLoader().load( '/static/eave/data/circle5.png' );
var resetFluid = false
var forceFluid = false

function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
}

let clock = new THREE.Clock()
let clientClock = new THREE.Clock()

function hslToRgb(h, s, l){
    var r, g, b;
    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

let serverFPS = 2
let clientFPS = 30
let pause = false
let animScale = serverFPS/clientFPS
let activeIndex = 0
let geoScale = 0.125
let animating = false
let animateCount = 0
let camera, scene, renderer, positions, colors, sizes, newPositions, newColors, newSizes, gridVals, lerpVal;
lerpVal = 0;
let names = []
let canvaslist = []
let renderUpdates = []
let yAxis = [] //data in Y-Axis

scene = new THREE.Scene();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;
captureNext = true

let intersectObjects = [];
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;

// vector lines flow lines 


function init() {
	lines =  2 * grid.length;
	geometry = new THREE.BufferGeometry();
	positions = new Float32Array( lines * 3 );
	colors = new Float32Array( lines * 3 );
	sizes = new Float32Array( lines );
	newPositions = new Float32Array( lines * 3 );
	for ( var i = 0, i3 = 0; i < lines/2; i ++, i3 += 6) {
        let [x,y,z] = grid[i]
		r = 0.05
		theta = 1
        let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
		// range is -4,4
		positions[ i3 + 0 ] = geoScale*(x);
		positions[ i3 + 1 ] = geoScale*(y);
		positions[ i3 + 2 ] = geoScale*(z)-0.5;
		positions[ i3 + 3 ] = geoScale*(x);
		positions[ i3 + 4 ] = geoScale*(y);
		positions[ i3 + 5 ] = geoScale*(z)-0.5;
		colors[ i3 + 0 ] = 0.5 * red/255;
		colors[ i3 + 1 ] = 0.5 * green/255;
		colors[ i3 + 2 ] = 0.5 * blue/255;
		colors[ i3 + 3 ] = red/255;
		colors[ i3 + 4 ] = green/255;
		colors[ i3 + 5 ] = blue/255;
		sizes[ i ] = geoScale*r;
		sizes[ i + 1 ] = geoScale*r;
		newPositions[ i3 + 0 ] = geoScale*(x);
		newPositions[ i3 + 1 ] = geoScale*(y);
		newPositions[ i3 + 2 ] = geoScale*(z)-0.5;
		newPositions[ i3 + 3 ] = geoScale*(x);
		newPositions[ i3 + 4 ] = geoScale*(y);
		newPositions[ i3 + 5 ] = geoScale*(z)-0.5;
	}
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
	geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
	var baseColor = new THREE.Color(0xffffff );
	// Sprites
	const material = new THREE.LineBasicMaterial( {
		color: 0xaaccff,
		linewidth: 1,
	} );
	lineSystem = new THREE.LineSegments( geometry, material );
	scene.add( lineSystem );
    
    let boxGeometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 );
	let boxMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color(`hsl(${255*Math.random()}, 100%, 77%)`) }  );
	box = new THREE.Mesh( boxGeometry, boxMaterial );
	// box.position.z=-0.5
	// box.material.wireframe = true
	// scene.add(box)
	window.addEventListener( 'resize', onWindowResize, false );
}

getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 1024;
	canvas.height= 1024;
	let el = document.createElement('div');
	el.style.position= 'absolute';
	el.style.opacity = 0;
	el.style.pointerEvents = 'none'
	el.style.height= '1024px' 
	el.style.width='1024px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}

updateFunction = (newGrid)=>{
    gridVals = newGrid
    for ( var i = 0, i3 = 0; i < lines/2; i++, i3 += 6) {
        let [x,y,z] = gridVals[i]
		newPositions[ i3 + 0 ] = newPositions[ i3 + 3 ];
		newPositions[ i3 + 1 ] = newPositions[ i3 + 4 ];
		newPositions[ i3 + 2 ] = newPositions[ i3 + 5 ];
		newPositions[ i3 + 3 ] = positions[ i3 + 0 ] + 0.3*x;
		newPositions[ i3 + 4 ] = positions[ i3 + 1 ] + 0.3*y;
		newPositions[ i3 + 5 ] = positions[ i3 + 2 ] + 0.3*z;
		lerpVal = 0
		
    } 
	// serverFPS = 1/clock.getDelta()
	animScale = 1/(clock.getDelta()*clientFPS)
	// geometry.attributes.position.needsUpdate = true;
}
// setup 5 simulatenous loops
updateServer = (pose, image,actions) => fetch('https://computeServer.ca/returnFluid/',{
        method: 'POST',
        body: xwwwform({
            'pose':pose,
            'image':image,
			'action':actions
        }),
        mode:'cors',  
        headers: {
            'X-Requested-With':'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(x=>x.json())
    .then(x=>{
        let spectra = x
		spec = spectra.map(x=> x.map(y=>parseFloat(y) ))
		if(!pause){
        	updateFunction(spec)
		}
		captureNext = true

    }).catch(x=>console.log(x))

let labels = []
let data = []
//add this to 3d enviroment

scrollTo(0,0)

var light = new THREE.AmbientLight( 0x404040, 7 ); // soft white light
scene.add( light );


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
              usagePreference: ["cpu-optimized", "gpu-optimized"],
              dataFormatPreference: ["luminance-alpha"]
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
scaleVec = new THREE.Vector3(geoScale, geoScale, geoScale)
function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
			clientFPS=1/clientClock.getDelta()
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
            // complex
			lerpVal = Math.min(lerpVal+animScale,1)
            for ( var i = 0, i3 = 0; i < lines/2; i ++, i3 += 6) {
				
            	positions[ i3 + 3 ] =  (lerpVal)*newPositions[ i3 + 3 ] + (1-lerpVal)* newPositions[ i3 + 0 ];
            	positions[ i3 + 4 ] =  (lerpVal)*newPositions[ i3 + 4 ] + (1-lerpVal)* newPositions[ i3 + 1 ];
            	positions[ i3 + 5 ] =  (lerpVal)*newPositions[ i3 + 5 ] + (1-lerpVal)* newPositions[ i3 + 2 ];
            }
            geometry.attributes.position.needsUpdate = true;
            if (captureNext) {
                const depthData = frame.getDepthInformation(view);
                if(depthData){
				    captureNext = false
					action = {reset:0, force:0}
					if(resetFluid){
						action.reset = 1
						resetFluid = false
					}
					if(forceFluid){
						action.force = 1
						forceFluid = false
					}
					clock.getDelta()
					data = new Uint8Array(depthData.data)
                    const jsonString = JSON.stringify(Array.from(data) )
					camera.updateMatrixWorld()
					const currentPosition = JSON.stringify([camera.position.toArray(), camera.quaternion.toArray(), depthData.rawValueToMeters, depthData.width, depthData.height])
                    updateServer(currentPosition, jsonString, JSON.stringify(action))
                }
            } else {
              console.log('unavailable')
			}
        }
    }

}
init()
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
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

document.getElementById('reset').addEventListener('click',x=>{
	resetFluid = true
})
document.getElementById('force').addEventListener('click',x=>{
	forceFluid = true
})
document.getElementById('pause').addEventListener('touchstart',x=>{
	repeat();
})
var holdTimeout = setTimeout(()=>{}, 200);
var repeat = function () {
	pause = true
	clearTimeout(holdTimeout);
	holdTimeout = setTimeout(repeat, 200);
}

document.getElementById('pause').addEventListener('touchstart',x=>{
	repeat();
})
document.getElementById('pause').addEventListener('touchend',x=>{
	clearTimeout(holdTimeout);
	pause = false
})
