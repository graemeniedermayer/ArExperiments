// https://threejs.org/examples/css3d_youtube
// with help from https://stackoverflow.com/questions/24681170/three-js-properly-blending-css3d-and-webgl/24688807#24688807
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
// document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

// css renderer
sceneCss = new THREE.Scene();

rendererCss = new CSS3DRenderer();
rendererCss.setSize(window.innerWidth, window.innerHeight);
rendererCss.domElement.style.position = 'absolute';
rendererCss.domElement.style.top = 0;
rendererCss.domElement.appendChild(renderer.domElement);
document.body.appendChild( rendererCss.domElement );


let intersectObjects = [];
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;
    // 2. This code loads the IFrame Player API code asynchronously.
	var tag = document.createElement('script');

	tag.src = "https://www.youtube.com/iframe_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

	// 3. This function creates an <iframe> (and YouTube player)
	//    after the API code downloads.
	var player;
	function onYouTubeIframeAPIReady() {
	  player = new YT.Player('iframe', {
		height: '390',
		width: '640',
		videoId: 'M7lc1UVf-VE',
		playerVars: {
		  'playsinline': 1
		},
		events: {
		  'onReady': onPlayerReady,
		}
	  });
	}

	// 4. The API will call this function when the video player is ready.
	function onPlayerReady(event) {
	  event.target.playVideo();
	}

function Element( id, x, y, z) {

	const div = document.createElement( 'div' );
	div.style.width = '390px';
	div.style.height = '640px';
	div.style.backgroundColor = '#000';
	const iframe = document.createElement( 'div' );
	iframe.id = 'player'
	div.appendChild( iframe );

	const object = new CSS3DObject( div );
	object.position.set( x, y, z );

	return object;
}

ele = new Element('a8X7iBAqwlc',0,0,-1)
ele.scale.copy(new THREE.Vector3(0.001,0.001,0.001))
sceneCss.add( ele)

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
	height: '390',
	width: '640',
	videoId: 'a8X7iBAqwlc',
	playerVars: {
	  'playsinline': 1
	},
	events: {
	  'onReady': onPlayerReady,
	}
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
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

var addPlanarGraph = (canvas, absPosition, size = 1) =>{
	let planeGeo =  new THREE.PlaneBufferGeometry( 1, 1, size, size );
	planeGeo.lookAt(camera.position)
	planeGeo.computeBoundingBox();
	let texture = new THREE.Texture( canvas ) ;
	let planeMat = new THREE.MeshBasicMaterial({map: texture});
	plane = new THREE.Mesh( planeGeo, planeMat );
	plane.position.z = absPosition[2]
	planeGeo.lookAt(camera.position)
	planeGeo.attributes.position.needsUpdate = true;
	plane.material.map.needsUpdate = true;
	return plane
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
		  player.platVideo()
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
	rendererCss.render( sceneCss, camera );
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
