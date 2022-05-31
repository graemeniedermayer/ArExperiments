// combining fabric with plane detections
  let names = []
let canvaslist = []
let renderUpdates = []
let quat180y = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
let quat90x = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))
let yAxis = [] //data in Y-Axis

let scene = new THREE.Scene();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

var camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
var renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

let intersectObjects = new Map();
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;

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
canvas1.add(img1);
var img2 = new fabric.Image(img1ele, {
	left: 20,
	top: 40,
	angle: 0,
	opacity: 1
  });
  scale2 = 0.4
  img2.set({
	  scaleX: scale2,
	  scaleY: scale2
  });
  canvas1.add(img2);
  var img3 = new fabric.Image(img1ele, {
	left: 100,
	top: 100,
	angle: 0,
	opacity: 1
  });
  scale3 = 0.6
  img3.set({
	  scaleX: scale1,
	  scaleY: scale1
  });
  canvas1.add(img3);

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
let labels = []
let data = []

scrollTo(0,0)
planes = []


function worldToLocal( givenObject, worldVec){
    localVec = new THREE.Vector3()
    givenObject.updateMatrixWorld(); 
	localVec.copy( worldVec )
	.sub(givenObject.position)
	.applyQuaternion( givenObject.quaternion.clone().invert() )
	return {x:localVec.x, y:localVec.y};
} 
		

function raycasterFunction( event) {
	mouse.x = ( event.clientX / window.outerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.outerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	let intersects = []
    intersectObjects.forEach(x=>{
        inters.push(x.mesh)
    })
	intersects = raycaster.intersectObjects( inters );
	return [intersects.length > 0 ? intersects[ 0 ]: undefined, raycaster.ray]
}


TOUCHSTATE = {}
var onMouseStart = (e)=>{
	let [obj, ray] = raycasterFunction(e)
	TOUCHSTATE[ 'mouse' ] = obj
	if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
		clickCanvas(obj.object.material.map.image, worldToLocal(obj.object,obj.point), e.type)
	}
	// new object
}
var onTouchStart = (e)=>{
	for( var j = 0; j < e.touches.length; j++ ) {
		let [obj,ray] = raycasterFunction(e.touches[ j ])
		if( obj ? (obj.object ? obj.object.type =='Mesh' : false) :false){
			clickCanvas(obj.object.material.map.image, worldToLocal(obj.object,obj.point), e.type)
		}
	}
}
function clickCanvas(thisCanvas, point, res) {
	let rect = thisCanvas.getBoundingClientRect();
	let x =  (parseFloat(canvas1.upperCanvasEl.style.width)*(1/2+point.x));
	let y = rect.top + parseFloat(canvas1.upperCanvasEl.style.height)*(1/2-point.y);
	if(res =='touchmove')res = 'mousemove'
	evt = new MouseEvent(res, {
		clientX: x,
		clientY: y
	}),
	canvas1.upperCanvasEl.dispatchEvent(evt);
}


window.addEventListener( 'mousedown', onMouseStart ,false);
window.addEventListener( 'touchstart', onTouchStart ,false);
window.addEventListener( 'mousemove', onMouseStart ,false);
window.addEventListener( 'touchmove', onTouchStart ,false);
window.addEventListener( 'mouseup', onMouseStart ,false);
window.addEventListener( 'touchend', onTouchStart ,false);
\
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
			chartUpdate()
        }
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

let planeId = 1;
let allPlanes = new Map();

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

planeMaterial =   new THREE.MeshBasicMaterial({
    map: new THREE.Texture( can1 ),
    opacity: 0.8,
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

          // Create plane origin visualizer:
          const originGroup = baseOriginGroup.clone();
          originGroup.visible = usePlaneOrigin.checked;

          planeMesh.add(originGroup);
          allPlaneOrigins.push(originGroup);

          const planeContext = {
            id: planeId,
            timestamp: plane.lastChangedTime,
            mesh: planeMesh,
            origin: originGroup,
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
