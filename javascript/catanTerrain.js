rot = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))

let camera, scene, renderer, xrRefSpace, gl, terrains;

scene = new THREE.Scene();
let planeSize = 0.5
let resolution = 400
const geometry = new THREE.PlaneGeometry(planeSize, planeSize, resolution-1, resolution-1);
let meshPlane;

fileSuffix = 'Edit.jpg'
let isInScene = {}
fileNames = [
    'clay1',
    'clay2',
    'sheep1',
    'sheep2',
    'desert1',
    'forest1',
    'forest2',
    'prarie1',
    'prarie2',
    'mountain1',
    'mountain2',
    'mountain3',
]
getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 512;
	canvas.height= 512;
	let el = document.createElement('div');
	el.style.position
	el.style.position= 'absolute';
	el.style.top= '2000px';// This should be a large number
	el.style.height= '1024px' 
	el.style.width='1024px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}

let canvas = getCanvas()

canvas.width = resolution;
canvas.height= resolution;
let grid = []
for(let i=0; i<resolution; i++){
	for(let j=0; j<resolution; j++){
		grid.push([ planeSize*i/resolution - planeSize/2, planeSize*j/resolution - planeSize/2])
	}
}
let ctx = canvas.getContext('2d');
imgData = ctx.createImageData(resolution, resolution);

textPanel = (text, position) =>{
	return new TextCanvas({
		string: text,
		fontsize: 300,
		loc1:[position.x,
			  position.y,
			  position.z],
		loc2:[0.1,0.1,0.1],
		geotype: {'canvasDepth':0.0, 'canvasHeight':0.25, 'scaleCanvas':0.1}
	})
}

let zero = new THREE.Vector3(0,0,0)
let textMeshes = []
let bitMaps = fileNames.map(x=>{
    return {
        image:null,
        widthInMeters: 0.05
    }
})
// wait for the images
var imgs = document.images,
    len = imgs.length,
    counter = 0;

[].forEach.call( imgs, function( img ) {
    if(img.complete)
      incrementCounter();
    else
      img.addEventListener( 'load', incrementCounter, false );
} );

function incrementCounter() {
    counter++;
    if ( counter === len ) {
		for(let i = 0; i< fileNames.length; i++){
			
			let textMesh = textPanel(fileNames[i], zero)
			textMeshes.push(textMesh.plane)
			let img  = document.getElementById(fileNames[i]);
			createImageBitmap(img).then(x=>{bitMaps[i].image = x});
		}
    }
}

let play = false
let clock = new THREE.Clock()

// standard webxr scene

var ambient = new THREE.AmbientLight( 0x222222 );
scene.add( ambient );
var directionalLight = new THREE.DirectionalLight( 0xdddddd, 2.2 );
directionalLight.position.set( 0.9, 1, 0.6 ).normalize();
scene.add( directionalLight );
var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 1.1 );
directionalLight2.position.set( -0.9, -1, -0.4 ).normalize();
scene.add( directionalLight2 );


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
            trackedImages: bitMaps,
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

			const results = frame.getImageTrackingResults();
			for (const result of results) {
			  // The result's index is the image's position in the trackedImages array specified at session creation
			  const imageIndex = result.index;
			
			  // Get the pose of the image relative to a reference space.
			  const pose1 = frame.getPose(result.imageSpace, xrRefSpace);
			  pos = pose1.transform.position
			  quat = pose1.transform.orientation
              //   does this need to be rotated

			  textMeshes[imageIndex].position.copy( pos.toJSON())
			  textMeshes[imageIndex].quaternion.copy(quat.toJSON())
			  textMeshes[imageIndex].quaternion.multiply(rot)
			  const state = result.trackingState;

			  if(state == 'tracked' && !isInScene[imageIndex]){
				scene.add(textMeshes[imageIndex])
				isInScene[imageIndex] = textMeshes[imageIndex].position.toArray()
			  }else if(isInScene[imageIndex]){
				isInScene[imageIndex] = textMeshes[imageIndex].position.toArray()
			  }
			
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
	var delta = clock.getDelta();
	renderer.render( scene, camera );
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click', x => AR())

ctx.putImageData(imgData,0,0);
let texture = new THREE.Texture(imgData)
texture.needsUpdate = texture
// let mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { color:'rgba(100,200,100,0.3)'} ) );
let mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { map: texture, side:THREE.DoubleSide, transparent:true } ) );
var alphaTexture = new THREE.TextureLoader().load( 'alphaMap.png', (x)=>{
	mesh.material.alphaMap= x
	mesh.material.needsUpdate = true
} );
mesh.quaternion.copy(camera.quaternion)
mesh.position.copy(camera.position)
mesh.rotateX(Math.PI/2)
mesh.rotateZ(Math.PI/2)

noiseFunc = new Noise(4);

let biomeNames = [
    'forest',
	'clay',
    'sheep',
    'praire',
    'mountain',
    'desert',
    'ocean'
]

// This uses the form
// [octaves: 14,
// persistence: 0.25,
// lacunarity: 3.3,
// scale: 791.0,
// exponentiation: 1.1,
// height: 79]
let biomeParameters =[
	[
		14,
	 	0.05,
		3.3,
		32.0,
		1.1,
		60
	],
    [
		12,
	 	0.25,
		2.5,
		32.0,
		1.0,
		40
	],
    [
		12,
	 	.95,
		3.5,
		100.0,
		2.0,
		200
	],
    [
		12,
	 	0.25,
		2.5,
		32.0,
		1.1,
		80
	],
    [
		7,
	 	1.6,
		20.8,
		100.0,
		0.8,
		320
	],
    [
		2,
	 	0.15,
	   	0.2,
	   	100.0,
	   	2.2,
	   	320
	],
    [
		2,
	 	0.15,
	   	0.2,
	   	200.0,
	   	0.2,
	   	10
	],
]


let noiseXY = (x,y, [octaves, persistence, lacunarity, scale, exponentiation, height])=>{
	const xs = x / scale;
	const ys = y / scale;
	// simplex
	const G = 2.0 ** (-persistence);
	let amplitude = 1.0;
	let frequency = 1.0;
	let normalization = 0;
	let total = 0;
	for (let o = 0; o < octaves; o++) {
	  const noiseValue = noiseFunc.simplex2(
		  xs * frequency, ys * frequency) * 0.5 + 0.5;
	  total += noiseValue * amplitude;
	  normalization += amplitude;
	  amplitude *= G;
	  frequency *= lacunarity;
	}
	total /= normalization;
	return Math.pow(
		total, exponentiation) * height;
}

let calcWeightArray = (activePoints)=>{
	let weightGrid = []
	let oceanWeight = 0.02
	for(let point of grid){

		let color = [0,0,0]
		let gaussWidth = 0.04
		let weightSum = 0
		let weightArray = []
		for(let i=0, size = activePoints.length; i < size; i++){
			let distance = Math.sqrt(
				(point[0] - activePoints[i][0] )**2 + 
				(point[1] - activePoints[i][1] )**2 
			)
			let weight = Math.E**(-(distance**2)/gaussWidth**2)
			weightArray.push( weight )
			weightSum += weight
		}
		// ocean to biomes simplfy this?
		weightArray.push( oceanWeight )
		weightSum += oceanWeight
		weightGrid.push( weightArray.map(x=>weightSum ==0 ? 0 : x/weightSum) )

	}	
	return weightGrid
}
let activeColorsToTerrain = [ 1, 1, 2, 2, 5, 0, 0, 3, 3, 4, 4, 4]	

// height adjusted (goes above 255y)
let colors = [
	[17, 90, 13],
	[200, 80, 0],
	[60, 179, 113],
	[250, 250, 180],
	[90, 90, 90],
	[255, 255, 140],
	[150, 150, 300],
]

let calcParamArray = (weightGrid)=>{
	let paramGrid = []
	// introduce 2d noise mixing here?
	let noise2d = 1
	for(let pointIndex in grid){
		let params = biomeParameters[0].map(x=>0)
		for(let weightIndex in weightGrid[0]){
			let biomeIndex = terrains[weightIndex]
			let biomeParams = biomeParameters[biomeIndex]
			for(let paramIndex in params){
				params[paramIndex] += biomeParams[paramIndex] * weightGrid[pointIndex][weightIndex]
			}
		}
		paramGrid.push(params)
	}
	
	return paramGrid
}

let calcColorArray = (weightGrid)=>{
	let colorGrid = []
	let noise2d = 1
	for(let pointIndex in grid){
		let color = [0,0,0]
		for(let weightIndex in weightGrid[0]){
			let biomeIndex = terrains[weightIndex]
			let colorBiome = colors[biomeIndex]
			let weight = weightGrid[pointIndex][weightIndex]
			color[0] += colorBiome[0] * weight
			color[1] += colorBiome[1] * weight
			color[2] += colorBiome[2] * weight
		}
		colorGrid.push(color)
	}
	
	return colorGrid
}

let buildTerrain = (paramArray, colorArray) => {
	const vertices = geometry.attributes.position.array;
	for (var i=0, k=0, j=0, l = paramArray.length; j < l; j++, k+=3, i+=4) {
		let [x,y] = grid[j]
		let params = paramArray[j]
		let [ red, green, blue] = colorArray[j]
		// averageShiftedActivePoints, activeColors
		let height = noiseXY( x, y, params)
		heightColorFactor = height/55 > 1 ? 1-height/55+55/55+(height/135)**5-(55/135)**5 : height/55
		imgData.data[i]   = red*heightColorFactor
	    imgData.data[i+1] = green*heightColorFactor
	    imgData.data[i+2] = blue*heightColorFactor
	    imgData.data[i+3] = 255; //alpha

		vertices[ k + 2 ] = -height/2500 ;
	}
	ctx.putImageData(imgData,0,0);
	texture.needsUpdate = true
	mesh.material.needsUpdate = true
	geometry.attributes.position.needsUpdate = true
}

let weightArray, paramArray, textureArray;
firstTime = true
document.getElementById('GameButton').addEventListener('click', x => {
	if(firstTime){
		firstTime = false
		scene.add( mesh );
	}
	let activeVec3s = Object.values(isInScene)
	let activePoints = activeVec3s.map(x=>[x[0],x[2]])
	let activeColors = Object.keys(isInScene)
	terrains = activeColors.map(x => activeColorsToTerrain[x])
	terrains.push(6)//ocean
	origin = [0,0,0]
	for(let point of activeVec3s){
		origin[0] += point[0];
		origin[1] += point[1];
		origin[2] += point[2];
	}	
	origin[0] /= activePoints.length;
	origin[1] /= activePoints.length;
	origin[2] /= activePoints.length;
	mesh.position.copy( new THREE.Vector3(origin[0], origin[1]+0.1, origin[2]) )

	weightArray= calcWeightArray(activePoints.map(x=>[x[0]-origin[0], x[1]-origin[2]]))
	paramArray= calcParamArray(weightArray)
	// texture array
	textureArray= calcColorArray(weightArray)
	// build heightMap
	buildTerrain(paramArray, textureArray)
})
