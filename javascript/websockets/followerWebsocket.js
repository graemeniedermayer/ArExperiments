const img  = document.getElementById('bitmap');
// Ensure the image is loaded and ready for use
var imgBitmap = null
getOrigin = true
let origin = new THREE.Object3D()
let  desktopCube, socket;
let firstPos = new THREE.Vector3()
let secondPos = new THREE.Vector3()
let firstQuat = new THREE.Quaternion()
let secondQuat =new THREE.Quaternion()

let quat270x = new THREE.Quaternion().setFromEuler(new THREE.Euler( 3*Math.PI/2, 0, 0, 'XYZ' ))

//   each frame send to socket.

let clock = new THREE.Clock()


// standard webxr scene

function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
}

let camera, scene, renderer, xrRefSpace, gl;

scene = new THREE.Scene();

let createAxes = (origin,directionQuat) => {
	let group = new THREE.Object3D()
	group.position.copy(origin)
	group.quaternion.copy(directionQuat)
	group.add(new THREE.AxesHelper())
	scene.add(group)
}

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

document.getElementById('channelSubmit').addEventListener('click',e=>{
	let channelName = document.getElementById('channelName');
	document.getElementById('channelSubmit').style.display = 'none';
	channelName.style.display = 'none';
	let qrImg = new QRCode(document.getElementById("qrCode"), channelName.value);
	createImageBitmap(qrImg).then(x=>{imgBitmap = x});
	socket = new ReconnectingWebSocket(`wss://compute.weaves.ca/ws/arTeam/${channelName.value}`, null ,{
	  timeoutInterval: 2000, 
	  maxReconnectAttempts: 10, 
	  binaryType: 'arraybuffer'
	})
	socket.onmessage = e=>{
		if(e.data.type == 'connect'){
			let connects = JSON.parse(e.data.connects)
			myIndex = e.data.index 
			let pixRatio = .3;
			let material = new THREE.MeshStandardMaterial({color: 0xdd00dd})
			let geometry = new THREE.BoxGeometry( 
				1080 * 0.0254/(1000*pixRatio),
				  1920 * 0.0254/(1000*pixRatio),  0.003, 1, 1, 1)
			for(let connect of connects){
				phones[connect] = new THREE.Mesh(material, geometry);
				scene.add(phones[connect])
			}
			// QR code defined here?
		}else{
			// maybe eventually multiplexing would make sense
			let {position, quat, index} = JSON.parse(e.data) 
        	
			phones[index].position.copy( new THREE.Vector3(...position))
        	phones[index].quat.copy( new THREE.Vector3(...quat))

		}
	}
  })

camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
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
            requiredFeatures: ['dom-overlay','image-tracking'],
            trackedImages: [
              {
                image: qrImg,
                widthInMeters: 0.2
              }
            ],
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
            if(getOrigin){
		const results = frame.getImageTrackingResults();
		for (const result of results) {

			const state = result.trackingState;
                  	if (state == "tracked") {
					// The result's index is the image's position in the trackedImages array specified at session creation
					const imageIndex = result.index;
				  
					// Get the pose of the image relative to a reference space.
					const pose1 = frame.getPose(result.imageSpace, xrRefSpace);
					pos = pose1.transform.position
					quat = pose1.transform.orientation
  
					firstPos.copy(pos.toJSON())
					firstQuat.copy(quat.toJSON()).multiply(quat270x)
					createAxes(firstPos, firstQuat)
					try{
					  secondPos.copy(phones[0].position)
					  secondQuat.copy(phones[0].quaternion)
					  createAxes(secondPos, secondQuat)
					  thirdQuat = firstQuat.clone().multiply(secondQuat.clone().inverse())
					  thirdPos = firstPos.clone().sub(secondPos.clone().applyQuaternion(thirdQuat) )
  
					  scene.position.copy( thirdPos)
					  scene.quaternion.copy( thirdQuat)

					  origin.position.copy( thirdPos)
					  origin.quaternion.copy( thirdQuat)
					}catch(e){
  
					}
					getOrigin = false
			    	// HighlightImage(imageIndex, pose1);
			} else if (state == "emulated") {
			    	// FadeImage(imageIndex, pose1);
			}
                }
	    }else{
				socket.send(
					JSON.stringify({
						'type': 'fromMobile',
						'index': myIndex,
						'quaternion': camera.quaternion.clone().multiply(thirdQuat.clone().inverse()).toArray(),
						'position': camera.position.clone().sub(thirdPos).toArray(),
						'time': clock.getDelta()
					})
				)
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

document.getElementById('resetOrigin').addEventListener('click',x=>{
    getOrigin = true
})

