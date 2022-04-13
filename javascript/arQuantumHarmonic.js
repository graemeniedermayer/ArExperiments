
var texture = new THREE.TextureLoader().load( '../data/circle5.png' );

let complexNumToPolar = (complexStr)=>{
    let complex = math.complex(complexStr)
    let real = complex.re
    let im = complex.im
    r = Math.sqrt(real**2 + im**2)
    phase = Math.atan2(complex.im, complex.re)
    return [r, phase]
}
let clock = new THREE.Clock()

function hslToRgb(h, s, l){
    var r, g, b;
    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

let animScale = 0.03
let geoScale = 0.1
let animating = false
let animateCount = 0
let camera, scene, renderer, positions, colors, sizes, newPositions, newColors, newSizes, gridVals;
let currentEigenvalue = 0;
let names = []
let canvaslist = []
let renderUpdates = []
let yAxis = [] //data in Y-Axis

scene = new THREE.Scene();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;


let intersectObjects = [];
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;

function init() {
	particles = grid.length;
	geometry = new THREE.BufferGeometry();
	positions = new Float32Array( particles * 3 );
	colors = new Float32Array( particles * 3 );
	sizes = new Float32Array( particles );
	newColors = new Float32Array( particles * 3 );
	newSizes = new Float32Array( particles );
	for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3) {
        let [x,y,z] = grid[i]
		r = 0.05
		theta = 1
        let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
		positions[ i3 + 0 ] = geoScale*(x);
		positions[ i3 + 1 ] = geoScale*(y);
		positions[ i3 + 2 ] = geoScale*(z)-0.5;
		colors[ i3 + 0 ] = red/255;
		colors[ i3 + 1 ] = green/255;
		colors[ i3 + 2 ] = blue/255;
		sizes[ i ] = geoScale*r;
		newColors[ i3 + 0 ] = red/255;
		newColors[ i3 + 1 ] = green/255;
		newColors[ i3 + 2 ] = blue/255;
		newSizes[ i ] = geoScale*r;
	}
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
	geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
	var baseColor = new THREE.Color(0xffffff );
	// Sprites
	var uniforms = {
		color:     { value: baseColor },
		tex:   { value: texture }
	};
	var shaderMaterial = new THREE.ShaderMaterial( {
        map: texture,
		uniforms: uniforms,
		vertexShader:  document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		depthTest:   true,
		transparent:   true,
		opacity: 0.5,
		depthWrite: true,
	});
	particleSystem = new THREE.Points( geometry, shaderMaterial );
	scene.add( particleSystem );
    
	window.addEventListener( 'resize', onWindowResize, false );
}

getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 1024;
	canvas.height= 1024;
	let el = document.createElement('div');
	el.style.position= 'absolute';
	el.style.opacity = 0;
	el.style.pointerEvents = 'none'
	el.style.height= '1024px' 
	el.style.width='1024px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}

updateGraph = (newGrid)=>{
    gridVals = newGrid
}

updateCanvasClick = (input) => fetch(`../data/harmonics/qh${input}min.json`)
    .then(x=>x.json())
    .then(x=>{
        currentEigenvalue = input
        updateGraph(JSON.parse(x))
    }).catch(x=>console.log(x))

makeGraph = () => {
	canvas = getCanvas()
	let ctx = canvas.getContext('2d');
	let myChart = new Chart(ctx, {
    	type: 'bar',
    	data: {
            labels: eigenvalues.map((_,i)=>i),
    	    datasets: [{
                label:'Eigenvalue Energy',
    	        data: eigenvalues.map(x=>[x-0.003,x+0.003]),
    	        backgroundColor: [
                'rgba(255, 99, 132, 0.3)'
    	        ],
    	        borderColor: [
                'rgba(255, 99, 132, 0.9)'
    	        ],
    	    }]
    	},
    	options: {
    	    legend:{
    	        display:false
    	    },
			offset:false,
			title: {
				display: true,
				text: 'Energy Spectra',
				fontFamily: 'Quicksand',
				fontSize: 55
			},
	        scales: {
	            y: {
					labelString: `Energy`,
					fontFamily: 'Quicksand',
					fontSize: 50
				},
				x: {
                    labelString: `eigenvalue number`,
					fontFamily: 'Quicksand',
					fontSize: 50
	            }
	        },
            
	    },
        chartArea:{
            top:0,
            left:0,
            right:1024,
            bottom:1024
        }
	});
    myChart.chartArea.top = 0
    myChart.chartArea.left = 0
    
	return [myChart, canvas]	
}


var addPlanarGraph = (canvas, absPosition, size = 1) =>{
	let planeGeo =  new THREE.PlaneBufferGeometry( 1, 1, size, size );
	planeGeo.lookAt(camera.position)
	planeGeo.computeBoundingBox();
	let texture = new THREE.Texture( canvas ) ;
	let planeMat = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
	plane = new THREE.Mesh( planeGeo, planeMat );
	plane.position.x = absPosition[0]
	plane.position.y = absPosition[1]
	plane.position.z = absPosition[2]
	planeGeo.lookAt(camera.position)
	planeGeo.attributes.position.needsUpdate = true;
	plane.material.map.needsUpdate = true;
	return plane
}
let labels = []
let data = []
//add this to 3d enviroment
let [currentDistribution, currentCanvas] = makeGraph();

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
	mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	let intersects = []
	intersects = raycaster.intersectObjects( intersectObjects );
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
function clickCanvas(thisCanvas, point, type) {
	let rect = thisCanvas.getBoundingClientRect();
	let x =  (rect.width*(1/2+point.x));
	let y = rect.top + rect.height*(1/2-point.y);
	evt = new MouseEvent(type, {
		clientX: x,
		clientY: y
	}),
	thisCanvas.dispatchEvent(evt);
    const datasetIndex = currentDistribution.getActiveElements()[0].index
    updateCanvasClick(datasetIndex);
}
window.addEventListener( 'mousedown', onMouseStart ,false);
window.addEventListener( 'touchstart', onTouchStart ,false);
window.addEventListener( 'mousemove', onMouseStart ,false);
window.addEventListener( 'touchmove', onTouchStart ,false);
window.addEventListener( 'mouseup', onMouseStart ,false);
window.addEventListener( 'touchend', onTouchStart ,false);

planes.push(addPlanarGraph(currentCanvas, [-0.4, -0.3, -0.3]))
scene.add(planes[0])
intersectObjects.push(planes[0])
var light = new THREE.AmbientLight( 0x404040, 7 ); // soft white light
scene.add( light );


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
          plane.lookAt(camera.position)
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
				optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
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
	        planes[0].material.map.needsUpdate = true;
            // complex
            for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3) {
            	colors[ i3 + 0 ] += (newColors[ i3 + 0 ] - colors[ i3 + 0 ]) * animScale;
            	colors[ i3 + 1 ] += (newColors[ i3 + 1 ] - colors[ i3 + 1 ]) * animScale;
            	colors[ i3 + 2 ] += (newColors[ i3 + 2 ] - colors[ i3 + 2 ]) * animScale;
            	sizes[ i ] += (newSizes[ i ] - sizes[ i ]) * animScale;
            }
            geometry.attributes.customColor.needsUpdate = true;
            geometry.attributes.size.needsUpdate = true;
            	
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

intervalFunc = () => {
    eigenvalue = eigenvalues[currentEigenvalue]
    let exp = math.evaluate(`e^(-${4*eigenvalue*clock.getElapsedTime()}i)`)
    for ( var i = 0, i3 = 0; i < particles; i++, i3 += 3) {
        let complex = math.multiply(math.complex(gridVals[i]), exp)
        let [r, theta] = complexNumToPolar(complex)
        let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
        newColors[ i3 + 0 ] = red/255;
        newColors[ i3 + 1 ] = green/255;
        newColors[ i3 + 2 ] = blue/255;
        newSizes[ i ] = 50*geoScale*r;
    }
}
setInterval( ()=> intervalFunc(), 1000);

updateCanvasClick(0)
var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
