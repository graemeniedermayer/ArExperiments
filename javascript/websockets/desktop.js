
let phoneCube, desktopCube, socket;

// standard threejs scene

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
let renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
const material = new THREE.MeshStandardMaterial( {color: 0x00ff00} );
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

let pixRatio = 1
// window.devicePixelRatio;
let cellphoneObj = new THREE.BoxGeometry(  
  1080 * 0.0254/(1000*pixRatio),
    1920 * 0.0254/(1000*pixRatio),  0.003, 1, 1, 1)
let cellphoneMaterial = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
phoneCube = new THREE.Mesh( cellphoneObj, cellphoneMaterial );
scene.add( phoneCube );
phoneCube.position.z -= 0.2

document.getElementById('channelSubmit').addEventListener('click',e=>{
  let channelName = document.getElementById('channelName')
  document.getElementById('channelSubmit').style.display = 'none'
  channelName.style.display = 'none'
  socket = new ReconnectingWebSocket(`wss://servername/ws/arDesktop/${channelName.value}`, null ,{
    timeoutInterval: 2000, 
    maxReconnectAttempts: 10, 
    binaryType: 'arraybuffer'
  })
  socket.onmessage = e=>{
    let {position, quaternion} = JSON.parse(e.data) 
    // update the camera object.
    phoneCube.position.copy( new THREE.Vector3(...position))
    phoneCube.quaternion.copy( new THREE.Quaternion(...quaternion))
   }
})

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true
controls.dampingFactor=0.05
controls.rotateSpeed=0.2
controls.target.z-=0.5


render()
function render() {
  controls.update()
	renderer.render( scene, camera );
	requestAnimationFrame( render );
}

// slider controls
let rangeX = document.getElementById('rangex');
let rangeY = document.getElementById('rangey');
let rangeZ = document.getElementById('rangez');
rangeX.addEventListener('input',()=>{
  desktopCube.position.x = parseFloat(rangeX.value)/100-.5;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: desktopCube.position.toArray()
  }));
});
rangeY.addEventListener('input',()=>{
  desktopCube.position.y = parseFloat(rangeY.value)/100-0.5;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: desktopCube.position.toArray()
  }));
});
rangeZ.addEventListener('input',()=>{
  desktopCube.position.z = parseFloat(rangeZ.value)/100-1;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: desktopCube.position.toArray()
  }));
});
