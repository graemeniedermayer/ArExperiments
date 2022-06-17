// WIP

  let names = []
let canvaslist = []
let renderUpdates = []
let quat180y = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
let quat90x = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))
let yAxis = [] //data in Y-Axis

let scene = new THREE.Scene();

let planeId = 1;
let allPlanes = new Map();

var camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
var renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

let intersectObjects = new Map();

getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 1024;
	canvas.height= 1024;
	let el = document.createElement('div');
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


// ray cast to the plane

can1 = document.getElementById('image')
can1height = can1.offsetHeight
can1width = can1.offsetWidth
var canvas1 = new fabric.Canvas('image', {});
canvas1.upperCanvasEl.parentElement.style.position='absolute'
canvas1.upperCanvasEl.parentElement.style.top='4000px'
img1ele = document.getElementById('ims');
 fabric.textureSize = 2048*2;

canvas1.setWidth(can1width)
canvas1.setHeight(can1height)

var img1 = new fabric.Image(img1ele, {
  left: 10,
  top:20,
  angle: 0,
  opacity: 1
});
scale1 = 0.2
img1.set({
    scaleX: scale1,
    scaleY: scale1
});

var addPlanarGraph = (canvas, absPosition, size = 1) =>{
	let planeGeo =  new THREE.PlaneBufferGeometry( 1, 1, size, size );
	planeGeo.lookAt(camera.position)
	planeGeo.computeBoundingBox();
	let texture = new THREE.Texture( canvas ) ;
	let planeMat = new THREE.MeshBasicMaterial({map: texture});
	plane = new THREE.Mesh( planeGeo, planeMat );
	plane.position.z = absPosition[2]
	planeGeo.lookAt(camera.position)
	planeGeo.attributes.position.needsUpdate = true;
	plane.material.map.needsUpdate = true;
	return plane
}

function createGeometryFromPolygon(polygon) {
	const geometry = new THREE.BufferGeometry();

	const vertices = [];
	const uvs = [];
	polygon.forEach(point => {
	  vertices.push(point.x, point.y, point.z);
	  uvs.push(point.x, point.z);
	})

	const indices = [];
	for(let i = 2; i < polygon.length; ++i) {
	  indices.push(0, i-1, i);
	}

	geometry.setAttribute('position',
	  new THREE.BufferAttribute(new Float32Array(vertices), 3));
	geometry.setAttribute('uv',
	  new THREE.BufferAttribute(new Float32Array(uvs), 2))
	geometry.setIndex(indices);

	return geometry;
  }
let labels = []
let data = []

var light = new THREE.AmbientLight( 0x404040, 7 ); // soft white light
scene.add( light );
var light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 1, -1, 1 ).normalize();
scene.add( light );


// ------------------------------------------------------------------
// webxr stuff below here

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
function init(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 10 );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  // renderer.gammaOutput = true;
  document.body.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );
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
          domOverlay: { root: document.body },
        };
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: {
				optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar', 'plane-detection'],
				domOverlay: {root: document.body}
			}
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

count = 0
function onXRFrame(t, frame) {
	processPlanes(t, frame)
    const session = frame.session;
	const referenceSpace = renderer.xr.getReferenceSpace();
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	if (pose) {    
		const ray = new XRRay(pose.transform);        
	}
}

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


planeMaterial =   new THREE.MeshBasicMaterial({
    map: new THREE.Texture( can1 ),
    opacity: 1.0,
    transparent: true,
});
  
function processPlanes(timestamp, frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (frame.detectedPlanes) {
      allPlanes.forEach((planeContext, plane) => {
        if (!frame.detectedPlanes.has(plane)) {
          // plane was removed
          allPlanes.delete(plane);
          intersectObjects.delete(plane)
          console.debug("Plane no longer tracked, id=" + planeContext.id);

          scene.remove(planeContext.mesh);
        }
      });

      frame.detectedPlanes.forEach(plane => {
        const planePose = frame.getPose(plane.planeSpace, referenceSpace);
        let planeMesh;

        if (allPlanes.has(plane)) {
          // may have been updated:
          const planeContext = allPlanes.get(plane);
          planeMesh = planeContext.mesh;

          if (planeContext.timestamp < plane.lastChangedTime) {
            // updated!
            planeContext.timestamp = plane.lastChangedTime;

            const geometry = createGeometryFromPolygon(plane.polygon);
            planeContext.mesh.geometry.dispose();
            planeContext.mesh.geometry = geometry;
          }
        } else {
          // new plane
          
          // Create geometry:
          const geometry = createGeometryFromPolygon(plane.polygon);
          planeMesh = new THREE.Mesh(geometry,planeMaterial);
          
          planeMesh.matrixAutoUpdate = false;

          scene.add(planeMesh);


          const planeContext = {
            id: planeId,
            timestamp: plane.lastChangedTime,
            mesh: planeMesh,
          };

          intersectObjects.set(plane, planeContext)
          allPlanes.set(plane, planeContext);
          console.debug("New plane detected, id=" + planeId);
          planeId++;
        }

        if (planePose) {
          planeMesh.visible = true;
          planeMesh.matrix.fromArray(planePose.transform.matrix);
        } else {
          planeMesh.visible = false;
        }
      });
    }
  }
function uploadFile(files){
	if(files){
		canvas1.clear()
		for (let i = 0; i < files.length; i++) {
		// doesn't this only use the last image
    	  if (files[i].type.match(/^image\//)) {
			file = files[i];
			fabric.Image.fromURL(URL.createObjectURL(file), function(image) {
           	  image.scaleToHeight(can1height);
			  image.filters = []
              canvas1.add(image);
            });
    	  }
    	}
	}
	planeMaterial.map = new THREE.Texture(can1)	
	planeMaterial.map.wrapT = THREE.RepeatWrapping;
	planeMaterial.map.wrapS = THREE.RepeatWrapping;
	planeMaterial.map.needsUpdate = true;
}

document.getElementById('file').addEventListener('change', (e) => uploadFile(e.target.files)); 
