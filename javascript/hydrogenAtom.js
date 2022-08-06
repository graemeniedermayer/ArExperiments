var texture = new THREE.TextureLoader().load( '../data/circle5.png' );
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

var camera, scene, renderer;
var positions, colors, sizes;
var newPositions, newColors, newSizes;
var attractor, light;
var controls;
let geoScale = 0.1
var room = {}; // so that 'room.visible' can be set even if room isn't loaded yet

init();
animate();

var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:1rem;`;

document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())
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


function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	var material = new THREE.MeshBasicMaterial( { color: "rgb(100, 100, 250)"} );
	// var particles = 20*10*150;
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
		uniforms:       uniforms,
		vertexShader:  document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		depthTest:   true,
		transparent:   true,
		opacity: 0.5,
		depthWrite: true,
	});
	particleSystem = new THREE.Points( geometry, shaderMaterial );
	scene.add( particleSystem );

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
		button.style.display = 'none';
		button.textContent = 'EXIT AR';

		currentSession = session;

	}
	function onSessionEnded( /*event*/ ) {

		currentSession.removeEventListener( 'end', onSessionEnded );

		renderer.xr.setSession( null );
		button.textContent = 'ENTER AR' ;

		currentSession = null;

	}
	if ( currentSession === null ) {
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

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	
	renderer.setAnimationLoop( render );
}

let animScale = 0.03
let animating = false
let animateCount = 0
function render() {
	if(animating){
		animateCount+=1
		for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3) {
			colors[ i3 + 0 ] += (newColors[ i3 + 0 ] - colors[ i3 + 0 ]) * animScale;
			colors[ i3 + 1 ] += (newColors[ i3 + 1 ] - colors[ i3 + 1 ]) * animScale;
			colors[ i3 + 2 ] += (newColors[ i3 + 2 ] - colors[ i3 + 2 ]) * animScale;
			sizes[ i ] += (newSizes[ i ] - sizes[ i ]) * animScale;
		}
		geometry.attributes.customColor.needsUpdate = true;
		geometry.attributes.size.needsUpdate = true;
		if(200<animateCount){
			animateCount = 0
			animating = false
		}
	}
	renderer.render( scene, camera );
}
let onInput = ()=>{
	a = 0.529*2//bohr radius 5e-11m 
    strategyWorker.postMessage({
		'type':'start',
		'm': m,
        'l': l,
        'n': n,
	})
    
}
if(window.Worker){
	let lockWorker = false
	strategyWorker = new Worker('../javascript/hydrogenWorker.js');
    strategyWorker.postMessage({
			'type':'grid',
			'grid': grid,
	})
	update = document.getElementById('update')
    update.addEventListener('click',()=>{
        m = parseInt(mEle.value)
        l = parseInt(lEle.value)
        n = parseInt(nEle.value)
		console.log([n,l,m])
        if(0<n && l<n && Math.abs(m)<=l && !animating && !lockWorker){
			onInput()
			lockWorker = true
		}
    })
	strategyWorker.onmessage = function(e) {
		let gridVals = e.data.grid
		console.log(e)
        for ( var i = 0, i3 = 0; i < particles; i++, i3 += 3) {
            let [ r, theta] = gridVals[i]
        	r = isNaN(r)? 0 : r
        	theta = isNaN(theta)? 0 : theta
            let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
        	newColors[ i3 + 0 ] = red/255;
        	newColors[ i3 + 1 ] = green/255;
        	newColors[ i3 + 2 ] = blue/255;
        	newSizes[ i ] = geoScale*r*2;
	    }
		expSize = 0.05
		maxSize = Math.max(...newSizes)
		newSizes = newSizes.map(x=> expSize*x/maxSize)
		animating = true
		lockWorker = false
	}
}
