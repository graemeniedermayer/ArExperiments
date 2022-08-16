const img  = document.getElementById('bitmap');
// Ensure the image is loaded and ready for use
var imgBitmap = null
getOrigin = true
let origin = new THREE.Object3D()
let  desktopCube, socket;

//   each frame send to socket.

let clock = new THREE.Clock()

// standard webxr scene

let camera, scene, renderer, xrRefSpace, gl;
let phones = {};
let connects = {};

scene = new THREE.Scene();

let geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
let material = new THREE.MeshStandardMaterial( {color: 0x00ff00} );
desktopCube = new THREE.Mesh( geometry, material );
scene.add( desktopCube );
desktopCube.position.z -= 0.5


var ambient = new THREE.AmbientLight( 0x222222 );
scene.add( ambient );
var directionalLight = new THREE.DirectionalLight( 0xdddddd, 1.5 );
directionalLight.position.set( 0.9, 1, 0.6 ).normalize();
scene.add( directionalLight );
var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 1 );
directionalLight2.position.set( -0.9, -1, -0.4 ).normalize();
scene.add( directionalLight2 );

let pixRatio = .3;
material = new THREE.MeshStandardMaterial({color: 0xdd00dd})
geometry = new THREE.BoxGeometry( 
	1080 * 0.0254/(1000*pixRatio),
	  1920 * 0.0254/(1000*pixRatio),  0.003, 1, 1, 1)


document.getElementById('channelSubmit').addEventListener('click',e=>{
	let channelName = document.getElementById('channelName');
	document.getElementById('channelSubmit').style.display = 'none';
	channelName.style.display = 'none';
	let qrImg = new QRCode(document.getElementById("qrCode"), channelName.value);
	// createImageBitmap(qrImg._oDrawing._elCanvas).then(x=>{imgBitmap = x});
	socket = new ReconnectingWebSocket(`wss://socketServer.ca/arTeam/${channelName.value}`, null ,{
	  timeoutInterval: 2000, 
	  maxReconnectAttempts: 10, 
	  binaryType: 'arraybuffer'
	})
	socket.onmessage = e=>{
		let data = JSON.parse(e.data)
		if(data.type == 'connect'){
			connects = data.connects
			myIndex = data.index 
			for(let connect of connects){
				let newMesh = new THREE.Mesh(geometry, material );
				phones[connect] = newMesh;
				scene.add(newMesh)
			}
			// QR code defined here?
		}else{
			// maybe eventually multiplexing would make sense
			let {position, quaternion, index} = data
        	if(!phones[index]){
				let newMesh = new THREE.Mesh( geometry, material );
				phones[index]  = newMesh;
				scene.add(newMesh)
			}
			phones[index].position.copy( new THREE.Vector3(...position))
        	phones[index].quaternion.copy( new THREE.Vector3(...quaternion))

		}
	}
  })

camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
renderer = new THREE.WebGLRenderer({antialias: true, alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

function init() {
	window.addEventListener( 'resize', onWindowResize, false );
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
            requiredFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
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

			socket.send(
				JSON.stringify({
					'type': 'fromMobile',
					'index': myIndex,
					'quaternion': camera.quaternion.toArray(),
					'position': camera.position.toArray(),
					'time': clock.getDelta()
				})
			)
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



document.getElementById('showQR').addEventListener('click',x=>{
    let el = document.getElementById("qrCode")
    if(el.style.display == 'none'){
        el.style.display = 'block'
    }else{
        el.style.display = 'none'
    }
})
