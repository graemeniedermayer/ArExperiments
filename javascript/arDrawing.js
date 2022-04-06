let names = []
let canvaslist = []
let renderUpdates = []
let quat180y = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
let quat90x = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))
let yAxis = [] //data in Y-Axis

let scene = new THREE.Scene();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

var camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
var renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;


let intersectObjects = [];
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;

getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 1024;
	canvas.height= 1024;
	let el = document.createElement('div');
	el.style.position= 'absolute';
	el.style.top= '2000px';// This should be a large number
	el.style.height= '1024px' 
	el.style.width='1024px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.strokeStyle=  "#FFFFFF";
    ctx.lineWidth = 4;
	ctx.strokeRect(0, 0, 1024, 1024);
	return canvas
}

let canvas = getCanvas()
let ctx = canvas.getContext('2d');

var addPlanarGraph = (canvas, absPosition, size = 1) =>{
	let planeGeo =  new THREE.PlaneBufferGeometry( 1, 1, size, size );
	planeGeo.lookAt(camera.position)
	planeGeo.computeBoundingBox();
	let texture = new THREE.Texture( canvas ) ;
	let planeMat = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
	plane = new THREE.Mesh( planeGeo, planeMat );
	plane.position.z = absPosition[2]
	planeGeo.lookAt(camera.position)
	planeGeo.attributes.position.needsUpdate = true;
	plane.material.map.needsUpdate = true;
	return plane
}
let labels = []
let data = []
let greenColor = []
let blueColor = [0,1,0]
//add this to 3d enviroment

scrollTo(0,0)
planes = []
updateFunc = (plane,step)=>{
	// var targetQuaternion = camera.quaternion.clone().multiply( quat180y)
	// if ( !plane.quaternion.equals( targetQuaternion ) ) {
	// 	plane.quaternion.slerp( targetQuaternion, 4*step );
	// }
}


function worldToLocal( givenObject, worldVec){
    localVec = new THREE.Vector3()
    givenObject.updateMatrixWorld(); 
	localVec.copy( worldVec )
	.sub(givenObject.position)
	.applyQuaternion( givenObject.quaternion.clone().invert() )
	return {x:localVec.x, y:localVec.y};
} 
		

function raycasterFunction( event) {
	mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	let intersects = []
	intersects = raycaster.intersectObjects( intersectObjects );
	return [intersects.length > 0 ? intersects[ 0 ]: undefined, raycaster.ray]
}

TOUCHSTATE = {}
var onMouseStart = (e)=>{
	let [obj, ray] = raycasterFunction(e)
	TOUCHSTATE[ 'mouse' ] = obj
	if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
		clickCanvas(obj.object.material.map.image, worldToLocal(obj.object,obj.point), e.type)
	}
	// new object
}
var onTouchStart = (e)=>{
	for( var j = 0; j < e.touches.length; j++ ) {
		let [obj,ray] = raycasterFunction(e.touches[ j ])
		if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
			clickCanvas(obj.object.material.map.image, worldToLocal(obj.object,obj.point), e.type)
		}
	}
}
var prevX = 0, currX = 0, prevY = 0, currY = 0;
function draw() {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}
function drawHandler(res, e) {
    if (res == 'touchstart' || res == 'mousedown') {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - canvas.offsetLeft;
        currY = e.clientY - canvas.offsetTop;
    }
    if (res == 'touchend' || res=='mouseup'|| res == "mouseout" ||'touchcancel') {
    }
    if (res == 'mousemove'|| res == 'touchmove') {
            prevX = currX;
            prevY = currY;
            currX = e.clientX - canvas.offsetLeft;
            currY = e.clientY - canvas.offsetTop;
			draw()
	}
}


function clickCanvas(thisCanvas, point, type) {
	let rect = thisCanvas.getBoundingClientRect();
	let x =  (thisCanvas.width*(1/2+point.x));
	let y = thisCanvas.height*(1/2-point.y);
	drawHandler(type, {
		clientX: x,
		clientY: y
	})
}


window.addEventListener( 'mousedown', onMouseStart ,false);
window.addEventListener( 'touchstart', onTouchStart ,false);
window.addEventListener( 'mousemove', onMouseStart ,false);
window.addEventListener( 'touchmove', onTouchStart ,false);
window.addEventListener( 'mouseup', onMouseStart ,false);
window.addEventListener( 'touchend', onTouchStart ,false);

planes.push(addPlanarGraph(canvas, [0, 0, -1.5]))
renderUpdates.push((e)=>updateFunc(planes[0], e))
scene.add(planes[0])
intersectObjects.push(planes[0])
var light = new THREE.AmbientLight( 0x404040, 7 ); // soft white light
scene.add( light );
var light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 1, -1, 1 ).normalize();
scene.add( light );
var clock = new THREE.Clock();

var chartUpdate = function () {
	planes[0].material.map.needsUpdate = true;
	var delta = clock.getDelta();
	var step = 0.5 * delta < 1 ? 0.5 * delta : 1;
	for(let i = 0; i<renderUpdates.length; i++){
		renderUpdates[i](step)
	}
};

// chart.js stuff above here
// ------------------------------------------------------------------
// webxr stuff below here

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
          domOverlay: { root: document.body },
        };
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

count = 0
function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
			chartUpdate();
        }
	}
}


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
