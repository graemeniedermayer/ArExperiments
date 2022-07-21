let phoneCube, desktopCube;

socket = new ReconnectingWebSocket(`wss://compute.weaves.ca/ws/desktopDevice/${channel}`, null ,{
    timeoutInterval: 2000, 
    maxReconnectAttempts: 10, 
    binaryType: 'arraybuffer'
  })
socket.onmessage = e=>{
    let {pos,quat} = JSON.parse(e.data)
    // update the camera object.
}
// when slider change
socket.send()

// standard threejs scene

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
let renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

// orbital control.


// slider controls
let rangeX = document.getElementById('rangeX');
let rangeY = document.getElementById('rangeY');
let rangeZ = document.getElementById('rangeZ');
rangeX.addEventListener('input',()=>{
  desktopCube.position.x = rangeX.value;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: [rangeX.value, rangeY.value, rangeZ.value]
  }));
});
rangeY.addEventListener('input',()=>{
  desktopCube.position.y = rangeY.value;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: [rangeX.value, rangeY.value, rangeZ.value]
  }));
});
rangeZ.addEventListener('input',()=>{
  desktopCube.position.z = rangeZ.value;
  socket.send(JSON.stringify({
    type: 'desktop',
    position: [rangeX.value, rangeY.value, rangeZ.value]
  }));
});
