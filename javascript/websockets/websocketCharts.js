let phoneCube, desktopCube, socket;

// standard threejs scene

getCanvas = () =>{
	let canvas = document.createElement('canvas');
    canvas.width =  window.innerWidth/3.1;
	canvas.height= window.innerHeight/4.1 ;
	let el = document.createElement('div');
	el.style.position= 'relative';
	el.style.display = 'inline-block';
  // This should be a large number
  // window.innerWidth/4, window.innerHeight/4
	el.style.height= window.innerHeight/4.1 + 'px' 
	el.style.width= window.innerWidth/3.1 + 'px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, window.innerWidth/3.1, window.innerHeight/4.1 );
	return canvas
}

makeGraph = (title, ylabel) => {
	canvas = getCanvas()
	let ctx = canvas.getContext('2d');
	let myChart = new Chart(ctx, {
    	type: 'bar',
    	data: {
			labels: [0],
    	    datasets: [{
    	        label:'o',
    	        data: [0,2,12,13,2],
    	        backgroundColor: [
                'rgba(255, 99, 132, 0.3)'
    	        ],
    	        borderColor: [
                'rgba(255, 99, 132, 0.9)'
    	        ],
    	        barPercentage: 1,
    	        borderWidth: 1
    	    }]
    	},
    	options: {
		responsive: false,
		devicePixelRatio: 1,
    	maintainAspectRatio: true,
    	    legend:{
    	        display:false
    	    },
			offset:false,
			title: {
				display: true,
				text: title,
				fontFamily: 'Quicksand',
				fontSize: 12
			},
	        scales: {
				display: true,
	            yAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: ylabel,
						fontFamily: 'Quicksand',
						fontSize: 10
					},
	                ticks: {
	                    beginAtZero: true
	                }
				}],
				xAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: `time`,
						fontFamily: 'Quicksand',
						fontSize: 10
					},
					barPercentage: 1.0,
					categoryPercentage: 1.0
	            }]
	        }
	    }
	});
	return [myChart, canvas]	
}
let values = {
  'dt' : [],  
  't' : [0],  
  'st' : ['0'],  
  'x' : [],  
  'y' : [],
  'z' : [],
  'vx' : [],
  'vy' : [],
  'vz' : [],
  'ax' : [],
  'ay' : [],
  'az' : [],
  'a':[],
  'v':[]
}
let [xcan, xdiv] = makeGraph( 'x', 'x (m)');
let [ycan, ydiv] = makeGraph( 'y', 'y (m)');
let [zcan, zdiv] = makeGraph( 'z', 'z (m)');
let [vxcan, vxdiv] = makeGraph( 'vx', 'vx (m/s)');
let [vycan, vydiv] = makeGraph( 'vy', 'vy (m/s)');
let [vzcan, vzdiv] = makeGraph( 'vz', 'vz (m/s)');
let [axcan, axdiv] = makeGraph( 'ax', 'ax (m/s^2)');
let [aycan, aydiv] = makeGraph( 'ay', 'ay (m/s^2)');
let [azcan, azdiv] = makeGraph( 'az', 'az (m/s^2)');
let [vcan, vdiv] = makeGraph( 'v', 'v');
let [acan, adiv] = makeGraph( 'a', 'a');

updateGraph = (graph, array, time) =>{
  graph.data.labels = time
  graph.data.datasets[0].backgroundColor = array.map((_,i)=>'rgba(132, 99, 255, 0.6)')
  graph.data.datasets[0].data = array

}

document.getElementById('channelSubmit').addEventListener('click',e=>{
	let channelName = document.getElementById('channelName')
	document.getElementById('channelSubmit').style.display = 'none'
	channelName.style.display = 'none'
	socket = new ReconnectingWebSocket(`wss://yourServer.ca/ws/arDesktop/${channelName.value}`, null ,{
	  timeoutInterval: 2000, 
	  maxReconnectAttempts: 10, 
	  binaryType: 'arraybuffer'
	})
	socket.onmessage = e=>{
		let {position, quaternion, time} = JSON.parse(e.data) 
    phoneCube.position.copy( new THREE.Vector3(...position))
    phoneCube.quaternion.copy( new THREE.Quaternion(...quaternion))
    values['dt'].push(time)
    values['x'].push(position[0])
    values['y'].push(position[1])
    values['z'].push(position[2])
    updateGraph(xcan, values['x'], values['st'])
    updateGraph(ycan, values['y'], values['st'])
    updateGraph(zcan, values['z'], values['st'])    
    if(values['x'].length >= 3){
      i1 = values['x'].length - 1
      i2 = values['x'].length - 2
      values['t'].push( values['t'][values['t'].length-1] + time )
      values['st'].push( (''+(values['t'][values['t'].length-1])).substring(0,4) )
      values['vx'].push( (position[0] - values['x'][i2]) / time)
      values['vy'].push( (position[1] - values['y'][i2]) / time)
      values['vz'].push( (position[2] - values['z'][i2]) / time)
	  l = values['vx'].length - 1
      values['v'].push( Math.sqrt(values['vx'][l]**2 + values['vy'][l]**2 + values['vz'][l]**2 ) )

      updateGraph(vxcan, values['vx'], values['st'].slice(1))
      updateGraph(vycan, values['vy'], values['st'].slice(1))
      updateGraph(vzcan, values['vz'], values['st'].slice(1)) 
      updateGraph(vcan, values['v'], values['st'].slice(1))  

      k1 = values['vx'].length - 1
      k2 = values['vx'].length - 2
      values['ax'].push( (values['vx'][k1] - values['vx'][k2] ) / time)
      values['ay'].push( (values['vy'][k1] - values['vy'][k2] ) / time)
      values['az'].push( (values['vz'][k1] - values['vz'][k2] ) / time)
	  j = values['az'].length - 1
      values['a'].push( Math.sqrt(values['ax'][j]**2 + values['ay'][j]**2 + values['az'][j]**2 ) )

      updateGraph(axcan, values['ax'], values['st'].slice(2))
      updateGraph(aycan, values['ay'], values['st'].slice(2))
      updateGraph(azcan, values['az'], values['st'].slice(2))  
      updateGraph(acan, values['a'], values['st'].slice(2))  

    }else if(values['x'].length >= 2){
      i1 = values['x'].length - 1
      i2 = values['x'].length - 2
      values['t'].push( values['t'][values['t'].length-1] + time )
      values['st'].push( (''+(values['t'][values['t'].length-1])).substring(0,4) )
      values['vx'].push( (position[0] - values['x'][i2]) / time)
      values['vy'].push( (position[1] - values['y'][i2]) / time)
      values['vz'].push( (position[2] - values['z'][i2]) / time)
      values['a'].push( Math.sqrt(values['vx']**2 + values['vy']**2 + values['vz']**2 ) )

    }
	
	}
})

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
let renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth/3.1, window.innerHeight/4.1 );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.domElement.style.display = 'inline-block';

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
	xcan.update()
	ycan.update()
	zcan.update()
	vxcan.update()
	vycan.update()
	vzcan.update()
	axcan.update()
	aycan.update()
	azcan.update()
	vcan.update()
	acan.update()
	
}

textFile = null;
document.getElementById('DownloadValues').addEventListener('click',x=>{
	data = new Blob([JSON.stringify(values)], {type:'text/plain'})
	if (textFile !== null) {
		window.URL.revokeObjectURL(textFile);
	}
	textFile = URL.createObjectURL(data);
	var a = document.createElement("a")
    a.href = textFile;
    a.download = `values${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(textFile);  
    }, 0); 
	txt = ''
})


// save functions
