
// set of images
let layerNames = [
	'conv1',
	'conv2',
	'conv3',
	'conv4',
	'conv5',
	'fc6',
	'fc7',
	'fc8',
];

let meshes = [
    (h,w) => new THREE.SphereGeometry( 1.8, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 1.5, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 1.3, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 1.1, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 0.9, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 0.23,128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 0.2, 128, 64, Math.PI/2, w, Math.PI/4, h ),
    (h,w) => new THREE.SphereGeometry( 0.17,128, 64, Math.PI/2, w, Math.PI/4, h ),
    //innerRadius : Float, outerRadius : Float, thetaSegments : Integer, phiSegments : Integer, thetaStart : Float, thetaLength : Float
];

let biasMeshes = [

    (h,w) => new THREE.RingGeometry( 1.785, 1.79, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 1.485, 1.49, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 1.285, 1.29, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 1.085, 1.09, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry(  0.95, 1.00, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 0.245, 0.25, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 0.215, 0.22, 32, 8, Math.PI/2, w ),
    (h,w) => new THREE.RingGeometry( 0.185, 0.19, 32, 8, Math.PI/2, w ),
]

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
let objs = []
let texture
loadWeights = (name, position, index)=>{
	let weightTexture = loader.load('/static/eave/data/alexNet/'+name+'.png', 
		(weightTexture)=>{
			let height = weightTexture.image.height/1000
			let width = weightTexture.image.width/1000
			let hwRatio = height/width
			// let planeGeo =  //new THREE.PlaneBufferGeometry( width, height, 1, 1 );			
			let planeMat = new THREE.MeshBasicMaterial({
				map: weightTexture, 
				uniforms : {
					tex:   { value: texture }
				},
				alphaMap: weightTexture, 
				// vertexShader:  document.getElementById( 'vertexshader' ).textContent,
				fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				side: THREE.DoubleSide,
				depthTest:   true,
				transparent:   true,
				depthWrite: true,
			});
			// information is lost in this step
			planeMat.color.b =0.9;
			planeMat.color.g =1.8;
			planeMat.color.r =1.8; 
			let radWidth, radHeight;
			if(hwRatio>1){
				radHeight = Math.PI/2 
				radWidth = (Math.PI/2)/hwRatio
			}else{
				radHeight = (Math.PI/2)*hwRatio
				radWidth = Math.PI/2
			}
			if(!name.includes('Bias')){
				plane = new THREE.Mesh( meshes[index](radHeight, radWidth), planeMat );
			}else{
				plane = new THREE.Mesh( biasMeshes[index](radHeight, radWidth), planeMat );
			}
			plane.material.map.magFilter = THREE.NearestFilter;
			plane.material.map.needsUpdate = true;
			plane.position.z=-2
			planeObj[name] = plane
			scene.add(plane)
			plane.rotation.x = Math.PI/2 *Math.random()
			plane.rotation.y = Math.PI/2 *Math.random()
			objs.push(plane)
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
		geotype: {'canvasDepth':0.0, 'canvasHeight':0.25, 'scaleCanvas':0.3}
	})
}

zDistanceStep = -0.1
zPosition = -0.5
for(let i=0; i < layerNames.length; i++){
	let name = layerNames[i]
	if(name.includes('conv')|| name.includes('fc') ){
		loadWeights(name, new THREE.Vector3(0, 0, zPosition), i)
		loadWeights(name + 'Bias', new THREE.Vector3(0, -0.01, zPosition+0.005), i)
	}
	if(name.includes('fc')){
		zPosition += zDistanceStep*3
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
rotRates=[]

function render() {
	renderer.render( scene, camera );
	for(let i = 0; i < objs.length; i++ ){
		objs[i].rotation.y += 0.003*(objs.length - i + 1)**(2/3)
	}
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())

