// I need to do some repo restructuring.

// This requires and HTML page served over SSL with a websocket hosted at fake.com (replace this) that transfers data to mobile_magnets.js 
import * as THREE from "three"
import {XRButton} from "xrbutton"
let scene, camera, renderer;
let origin = new THREE.Vector3();
let originQuat = new THREE.Quaternion();
let quatx = new THREE.Quaternion().setFromEuler(new THREE.Euler( 3*Math.PI/2, 0, 0, 'XYZ' ))
// let quaty = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
let quatz = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, 0, Math.PI, 'XYZ' ))

// websocket for magnetic measures
let channelNameValue = '1'
let socket = new ReconnectingWebSocket(`wss://fake.com/ws/questMagnet/${channelNameValue}`, null ,{
  timeoutInterval: 2000, 
  maxReconnectAttempts: 10, 
  binaryType: 'arraybuffer'
})

let magCoords = {}
let arrows = []
let phonePlacements = {}
let ones = new THREE.Vector3(1,1,1)
socket.onmessage = e => {
    // magnetic field measurements
	let packet = JSON.parse(e.data)
	let type = packet.type
	if( type =='mag'){
		if(arrows.length>800){//reset after 800 measurements
			arrows = []
			for( var i = scene.children.length - 1; i >= 0; i--) { 
				 let obj = scene.children[i];
				 scene.remove(obj); 
			}
			for(let phoneCube of Object.values(phonePlacements)){
				scene.add(phoneCube)
			}
		}
		let {id, mag, pos, quat} = packet
    	// local measures.
		let magVector = new THREE.Vector3( mag[0], mag[1], mag[2])
		let magPosition = new THREE.Vector3( pos[0], pos[1], pos[2])
		let phoneQuat = new THREE.Quaternion( quat[0], quat[1], quat[2], quat[3])
		// apply transforms from camera
		try{
			let [pos, quat] = magCoords[id]
			// correct?
			magVector = magVector.applyQuaternion(quat)
			// apply quaternion?
			magPosition = magPosition.add(pos)//.sub(origin)
			phoneQuat = pkhoneQuat.multiply(quat)
			let magLength = Math.sqrt(magVector.x**2 + magVector.y**2 + magVector.z**2)/2000//this might be very long
			let arr = new THREE.ArrowHelper( magVector.clone().normalize(), magPosition, magLength, 0xffff00 );
			// limit the amount of arrows?
			scene.add(arr)
			arrows.push(arr)
			try{
				let phoneCube = phonePlacements[id] 
				// magMat = magMat.multiply(rotMat)
				phoneCube.position.copy(magPosition)
				phoneCube.quaternion.copy(phoneQuat)
			}catch(e){}
		}catch(e){
			console.log('image missing')
		}
	}else if(type==='image'){
		let {id, posImg, quatImg, pos, quat} = packet
		let questPos_questCoord = camera.position.clone()
		let questQuat_questCoord = camera.quaternion.clone()
		let mobilePos_mobileCoord = new THREE.Vector3(...Object.values(pos))
		let mobileQuat_mobileCoord = new THREE.Quaternion(...Object.values(quat))

		let questPos_mobileCoord = new THREE.Vector3(...Object.values(posImg))
		let questQuat_mobileCoord = new THREE.Quaternion(...Object.values(quatImg))
		let transform = questPos_questCoord.sub(questPos_mobileCoord)
		let quaternion = (questQuat_mobileCoord.conjugate().multiply(questQuat_questCoord)).multiply(quatz).multiply(quatx)
		magCoords[id] = [transform, quaternion]
		if(!phonePlacements[id]){
			const material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe:true } );
			const geometry = new THREE.BoxGeometry( 0.09, 0.12, 0.02 );
			let phoneCube = new THREE.Mesh( geometry, material );
			phoneCube.position.copy(mobilePos_mobileCoord.add(transform))//.sub(origin))
			phoneCube.quaternion.copy(mobileQuat_mobileCoord.multiply(quaternion))
			scene.add( phoneCube );
			phonePlacements[id] = phoneCube
		}else{
			let phoneCube = phonePlacements[id]
			phoneCube.position.copy(mobilePos_mobileCoord.add(transform).sub(origin))
			phoneCube.quaternion.copy(mobileQuat_mobileCoord.multiply(quaternion))
		}
	
	}
}

// quest ui

function init() {
    scene = new THREE.Scene();
	// for debugging
	globalThis.scene = scene
    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	// camera.position.x = -1
	const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
	setInterval(e=>{
		socket.send(JSON.stringify({
			pos: camera.position.toArray(),
			quat: camera.quaternion.toArray()
		  }))
	},100)
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );
    
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	renderer.setAnimationLoop( render );
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
	renderer.render( scene, camera );
}

function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
}
init();
let xrButton = XRButton.createButton( renderer,
	{ 
	   'optionalFeatures': [ 'depth-sensing'],
	//    'optionalFeatures': [ 'local'] 
   } 
)
document.body.appendChild( xrButton );
xrButton.addEventListener('click' , e => {
	console.log('click')
	// check for first response in webxr
	let clickTimeout = (e) => {setTimeout( e=>{
		if(camera.position.length()>0){
			origin.copy(camera.position)
			originQuat.copy(camera.quaternion)
		}else{
			clickTimeout()
		}
	},100)}
	clickTimeout()
})
