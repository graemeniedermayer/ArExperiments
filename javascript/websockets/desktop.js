let phoneCube, desktopCube, socket;

channelName = document.getElementById('channelName')
document.getElementById('channelSubmit').addEventListener(e=>{
  document.getElementById('channelSubmit').style.display = 'none'
  channelName.style.display = 'none'
  socket = new ReconnectingWebSocket(`wss://servername/ws/arMobile/${channelName.value}`, null ,{
    timeoutInterval: 2000, 
    maxReconnectAttempts: 10, 
    binaryType: 'arraybuffer'
  })
  socket.onmessage = e=>{
    let {position, quaternion} = JSON.parse(e.data) 
    // update the camera object.
    phoneCube.position = new THREE.Vector3(...position)
    phoneCube.quaternion = new THREE.Vector4(...quaternion)
   }
})


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
