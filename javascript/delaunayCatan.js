// check that image tracking works
rot = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))

let camera, scene, renderer, xrRefSpace, gl;

scene = new THREE.Scene();

// Check if it works..
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

textPanel = (text, position) =>{
	return new TextCanvas({
		string: text,
		fontsize: 120,
		loc1:[position.x,
			  position.y,
			  position.z],
		loc2:[0.1,0.1,0.1],
		geotype: {'canvasDepth':0.0, 'canvasHeight':0.25, 'scaleCanvas':0.3}
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
// wait for the images?
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

// We'll probably be double plotting lines
plotLines => (point2d)=>{
    let deln = new Delaunator(point2d)
    let traingles = deln.traingles
    let edges = []
    for(let i=0; i<traingles.length/3; i++){
        edges.push([point2d[ 3*i + 0 ], point2d[ 3*i + 1 ]])
        edges.push([point2d[ 3*i + 0 ], point2d[ 3*i + 2 ]])
        edges.push([point2d[ 3*i + 2 ], point2d[ 3*i + 1 ]])
    }

    var lineNum = edges.length;
    let positions = new Float32Array(lineNum * 6);
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial( {
        color: 0xaaaaff,
        linewidth: 1,
    } );


    if(delaunayLines){
        delaunayLines.geometry.dispose()
        delaunayLines.material.dispose()
        scene.remove(delaunayLines)
    }
    delaunayLines = new THREE.LineSegments(geometry, material);

    for (i = 0; i < edges.length; i++) {
        var point1 = edges[2*i];
        var point2 = edges[2*i+1];
        positions.set([...point1, ...point2], 6 * i);
    }

    geometry.setDrawRange(0, 2 * edges.length);
    scene.add(delaunayLines);
}

let play = false

let clock = new THREE.Clock()

// standard webxr scene

function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
}


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
			//   const state = result.trackingState;

			  if(state == "tracked" && !isInScene[index]){
				scene.add(textMesh.plane)
				isInScene[index] = true
			  }else{
                // emulated color change?
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
document.getElementById('ArButton').addEventListener('click',x=>AR())

