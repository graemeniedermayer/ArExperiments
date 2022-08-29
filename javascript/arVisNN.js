
// set of images

// 

let layerNames = [
	'Input Image 224x224x3',
	'conv1', //(4 stride)
	'Relu',
	'maxPool1 (3x3 kernel + 2 stride)',
	'conv2',// (2 pad)
	'Relu',
	'maxPool2 (3x3 kernel + 2 stride)',
	'conv3',// (1 pad)
	'Relu',
	'conv4',// (1 pad)
	'Relu',
	'conv5',// (1 pad)
	'Relu',
	'maxPool3 (3x3 kernel + 2 stride)',
	'Flatten',
	'fc6smaller',//
	'Relu+Dropout(p=0.5)',
	'fc7smaller',//
	'Relu+Dropout(p=0.5)',
	'fc8'//
];

// evaluate weights?

let clock = new THREE.Clock()

// standard webxr scene

let camera, scene, renderer, xrRefSpace, gl;

scene = new THREE.Scene();

var ambient = new THREE.AmbientLight( 0x222222 );
scene.add( ambient );
var directionalLight = new THREE.DirectionalLight( 0xdddddd, 1.5 );
directionalLight.position.set( 0.9, 1, 0.6 ).normalize();
scene.add( directionalLight );
var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 1 );
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

let liveWeights;
let loader = new THREE.TextureLoader()
let planeObj = {}
let texture
loadWeights = (name, position)=>{
	let weightTexture = loader.load('./data/alexnet/'+name+'.png', 
		(weightTexture)=>{
			let height = weightTexture.image.height
			let width = weightTexture.image.width
			let planeGeo =  new THREE.PlaneBufferGeometry( width/1000, height/1000, 1, 1 );
			let planeMat= new THREE.MeshBasicMaterial({map: weightTexture, side: THREE.DoubleSide});
			if(name.includes('conv')){
				planeMat = new THREE.MeshBasicMaterial({
					map: weightTexture, 
					uniforms : {
						tex:   { value: texture }
					},
					// alphaMap: weightTexture, 
					// vertexShader:  document.getElementById( 'vertexshader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
					side: THREE.DoubleSide,
					depthTest:   true,
					transparent:   true,
					depthWrite: true,
				});
			}else{
				planeMat = new THREE.MeshBasicMaterial({map: weightTexture, side: THREE.DoubleSide});
			}
			plane = new THREE.Mesh( planeGeo, planeMat );
			planeGeo.attributes.position.needsUpdate = true;
			plane.material.map.magFilter = THREE.NearestFilter;
			plane.material.map.needsUpdate = true;
			plane.position.copy(position)
			planeObj[name] = plane
			scene.add(plane)
		}
	)
}

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

zDistanceStep = -0.1
zPosition = -0.5
for(let i=0; i < layerNames.length; i++){
	let name = layerNames[i]
	if(name.includes('conv')|| name.includes('fc') ){
		loadWeights(name, new THREE.Vector3(0, 0, zPosition))
		loadWeights(name + 'Bias', new THREE.Vector3(0, 0.5, zPosition+0.005))
		let canvas = textPanel(name, new THREE.Vector3(1, 0, zPosition+0.01))
		canvas.update()
		scene.add(canvas.plane)
	}else if(name.includes('fc') ){
		let canvas = textPanel(name, new THREE.Vector3(0, 0, zPosition))
		canvas.update()
		scene.add(canvas.plane)
	}
	if(name.includes('fc')){
		zPosition += zDistanceStep
	}else{
		zPosition += zDistanceStep
	}
	// add 
}


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


