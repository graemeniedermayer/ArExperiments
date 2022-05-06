
var texture = new THREE.TextureLoader().load( '/static/eave/data/circle5.png' );

function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
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
let activeIndex = 0
let geoScale = 0.25
let animating = false
let animateCount = 0
let camera, scene, renderer, positions, colors, sizes, newPositions, newColors, newSizes, gridVals;
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
captureNext = true

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
		// glass range is -2, 2
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
    let boxGeometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 );
	let boxMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color(`hsl(${255*Math.random()}, 100%, 77%)`) }  );
	box = new THREE.Mesh( boxGeometry, boxMaterial );
	box.position.z=-0.5
	box.material.wireframe = true
	scene.add(box)
	// add box
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

updateFunction = (newGrid)=>{
    gridVals = newGrid
    for ( var i = 0, i3 = 0; i < particles; i++, i3 += 3) {
        let r = gridVals[i]
        theta = 0
        let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
        newColors[ i3 + 0 ] = red/255;
        newColors[ i3 + 1 ] = green/255;
        newColors[ i3 + 2 ] = blue/255;
        newSizes[ i ] = 50*geoScale*r;
    } 
}

updateServer = (pose, image) => fetch('https://compute.weaves.ca/returnGlass/',{
        method: 'POST',
        body: xwwwform({
            'pose':pose,
            'image':image
        }),
        mode:'cors',  
        headers: {
            'X-Requested-With':'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(x=>x.json())
    .then(x=>{
        let spectra = x
		spec = spectra.map(x=>parseFloat(x))
        updateFunction(spec)
        captureNext = true

    }).catch(x=>console.log(x))

let labels = []
let data = []
//add this to 3d enviroment

scrollTo(0,0)

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
            requiredFeatures: ['depth-sensing', 'dom-overlay'],
            domOverlay: { root: document.body },
            depthSensing: {
              usagePreference: ["cpu-optimized", "gpu-optimized"],
              dataFormatPreference: ["luminance-alpha"]
            }
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
            // complex
            for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3) {
            	colors[ i3 + 0 ] += (newColors[ i3 + 0 ] - colors[ i3 + 0 ]) * animScale;
            	colors[ i3 + 1 ] += (newColors[ i3 + 1 ] - colors[ i3 + 1 ]) * animScale;
            	colors[ i3 + 2 ] += (newColors[ i3 + 2 ] - colors[ i3 + 2 ]) * animScale;
            	sizes[ i ] += (newSizes[ i ] - sizes[ i ]) * animScale;
            }
            geometry.attributes.customColor.needsUpdate = true;
            geometry.attributes.size.needsUpdate = true;
            if (captureNext) {
                const depthData = frame.getDepthInformation(view);
                if(depthData){
				    captureNext = false
					scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(depthData.width/depthData.height*2*360) )
				    data = new Uint8Array(depthData.data)
                    const jsonString = JSON.stringify(Array.from(data) )
                    const currentPosition = JSON.stringify([camera.matrixWorld.elements, depthData.rawValueToMeters, depthData.width, depthData.height])
                    updateServer(currentPosition, jsonString)
                }
            } else {
              console.log('unavailable')
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
	renderer.render( scene, camera );
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
