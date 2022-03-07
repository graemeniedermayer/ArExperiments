let cartesianToRadial = (x,y,z) => {
    let r = Math.sqrt(x**2+y**2+z**2)
    let theta = Math.atan2(y,x)
    let phi = Math.acos(z / r)
    return [r, theta, phi]
}
let sphereToCartesian = ( r, theta, phi) => {
	let x= r * Math.sin(phi)* Math.cos(theta)
	let y= r * Math.sin(phi)* Math.sin(theta)
	let z= r * Math.cos(phi)
    return [x, y, z]
}
var texture = new THREE.TextureLoader().load( 'circle5.png' );
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
let legendrePoly = '0'
let laguerrePoly = '0'
let harmonicScale = 0
let normalization = 0
let m = 1
let l = 1
let n = 3
let a = 0.529*2//bohr radius 5e-11m 
let createLegendreExpression = (m, l)=>{
    express = `(x^2 - 1 )^${l}`
    for(let k=0; k<l+m; k++){
        express = math.derivative(express,'x')
    }
    // is that the best way to handle factorial?
    return `(-1)^${m}*(1-x^2)^(${m}/2)/(2^${l}*${l}!)*(${express})`
}
let createLaguerreExpression = (alpha, n)=>{
    express = `e^(-x)*x^(${n+alpha})`
    for(let k=0; k<n; k++){
        express = math.derivative(express,'x')
    }
    return `x^(-${alpha})*e^x/${n}!*(${express})`
}
let createHarmonicScaleValue = (m, l)=>{
    return math.evaluate( `sqrt((${2*l+1})/(${4*Math.PI})*(${l-m})!/(${l+m})!)`)
}
let createNormalizationValue = (n, l, a)=>{
    console.log(`sqrt(${8/(n*a)**3}*(${n-l-1})!/(${2*n}*(${n+l})!))`)
    return math.evaluate(`sqrt(${8/(n*a)**3}*(${n-l-1})!/(${2*n}*(${n+l})!))`)
}
//sphericalHamonic
let sH = (m, l, theta, phi)=>{
    legendre = math.evaluate(`(${legendrePoly})`, {x:Math.cos(theta)})
    phase = `e^(i*${m}*${phi})` 
    return `${harmonicScale}*${phase}*${legendre}`
}
let waveFunc = (r, theta, phi, n, l, m)=>{//bohr radius
    let rho = 2*r/(n*a)//density
    let glp = math.evaluate( laguerrePoly, {x:rho})
    let shv = math.evaluate( sH(m, l, theta, phi) )//complex number...
    return math.evaluate(
        `${normalization} * e^(${-rho/2}) * ${rho**l} * ${glp} * ${shv}`
    )
}

let complexNumToPolar = (complexStr)=>{
    let complex = math.complex(complexStr)
    let real = complex.re
    let im = complex.im
    r = Math.sqrt(real**2 + im**2)
    phase = Math.atan2(complex.im, complex.re)
    return [r, phase]
}
mEle = document.getElementById('mEle')
lEle = document.getElementById('lEle')
nEle = document.getElementById('nEle')
let onInput = ()=>{
    m = parseInt(mEle.value)
    l = parseInt(lEle.value)
    n = parseInt(nEle.value)
	a = 0.529*2//bohr radius 5e-11m 
    laguerrePoly = createLaguerreExpression(2*l +1, n-l-1)
    legendrePoly = createLegendreExpression(m, l)
    harmonicScale = createHarmonicScaleValue(m, l)
    normalization = createNormalizationValue(n, l, a)
}
grid = []
laguerrePoly = createLaguerreExpression(2*l +1, n-l-1)
legendrePoly = createLegendreExpression(m, l)
harmonicScale = createHarmonicScaleValue(m, l)
normalization = createNormalizationValue(n, l, a)
// for(let x=-1.5; x<1.5; x+=0.1){
//     gridyz = []
//     for(let y=-1.5; y<1.5; y+=0.1){
//         gridz = []
//         for(let z=-1.5; z<1.5; z+=0.1){
// 			let x1 = 3*(Math.random()-0.5)
// 			let y1 = 3*(Math.random()-0.5)
// 			let z1 = 3*(Math.random()-0.5)
//             let [r, theta, phi] = cartesianToRadial(x1,y1,z1) 
//             // let [r, theta, phi] = cartesianToRadial(x,y,z) 
//             let waveVal = waveFunc(r, theta, phi, n, l, m)
//             let [waveR, wavePhase] = complexNumToPolar(waveVal)
//             // gridz.push([x, y, z+1.5, waveR, wavePhase])
//             gridz.push([x1, y1, z1+1.5, waveR, wavePhase])
//         }
//         gridyz.push(gridz)
//     }
//     grid.push(gridyz)
// }

// for(let x=-1.5; x<=1.5; x+=0.1){ //grid
//     gridyz = []
//     for(let y=-1.5; y<=1.5; y+=0.1){
//         gridz = []
//         for(let z=-1.5; z<=1.5; z+=0.1){
//             let [r, theta, phi] = cartesianToRadial(x,y,z) 
//             let waveVal = waveFunc(r, theta, phi, n, l, m)
//             let [waveR, wavePhase] = complexNumToPolar(waveVal)
//             gridz.push([x, y, z-2.5, waveR, wavePhase])
//         }
//         gridyz.push(gridz)
//     }
//     grid.push(gridyz)
// }
// gridxyz = []
// gridrtp = []
// for(let theta= 0; theta<Math.PI*2; theta+=Math.PI*2/20){ //spherical
// 	grid2 = []
//     for(let phi= 0; phi<Math.PI; phi+=Math.PI/10){
//         grid3 = []
//         for(let r=0; r<1.5; r+=.01){
//             let waveVal = waveFunc(r, theta, phi, n, l, m)
//             let [waveR, wavePhase] = complexNumToPolar(waveVal)
//             let [x,y,z] =  sphereToCartesian(r, theta, phi)
//             grid3.push([x, y, z-2.5, waveR, wavePhase])
//         }
//         grid2.push(grid3)
//     }
//     grid.push(grid2)
// }
for(let theta= 0; theta<Math.PI*2; theta+=Math.PI*2/20){ //spherical
	grid2 = []
    for(let phi= 0; phi<Math.PI; phi+=Math.PI/10){
        grid3 = []
        for(let r=0; r<1.5; r+=.01){
			let theta1 = Math.random()*2* Math.PI
			let phi1 = Math.random()*Math.PI
			let r1 = Math.random()* 2
            let waveVal = waveFunc(r1, theta1, phi1, n, l, m)
            let [waveR, wavePhase] = complexNumToPolar(waveVal)
            let [x,y,z] =  sphereToCartesian(r1, theta1, phi1)
            grid3.push([x, y, z-2.5, waveR, wavePhase])
        }
        grid2.push(grid3)
    }
    grid.push(grid2)
}

mEle.addEventListener('input',()=>{
    onInput()
})
lEle.addEventListener('input',()=>{
    onInput()
})
nEle.addEventListener('input',()=>{
    onInput()
})


  
var camera, scene, renderer;
var attractor, light;
var controls;
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
	var particles = 20*10*150;
	// var particles = 30*30*30;
	var geometry = new THREE.BufferGeometry();
	var positions = new Float32Array( particles * 3 );
	var colors = new Float32Array( particles * 3 );
	var sizes = new Float32Array( particles );
	for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3) {
        // xindex = i % 30
        // yindex = ((i - xindex)/30)%30
        // zindex = (i - xindex - 30*yindex)/900
		xindex = i % 20
        yindex = ((i - xindex)/20)%10
        zindex = (i - xindex - 20*yindex)/200
        arr = grid[xindex][yindex][zindex]
        let [x, y, z, r, theta] = arr
		r = isNaN(r)? 0 : r
		theta = isNaN(theta)? 0 : theta
        let [red, green, blue] = hslToRgb(theta/(2*Math.PI), 0.8, 0.8)
		positions[ i3 + 0 ] = x;
		positions[ i3 + 1 ] = y;
		positions[ i3 + 2 ] = z;
		colors[ i3 + 0 ] = red/255;
		colors[ i3 + 1 ] = green/255;
		colors[ i3 + 2 ] = blue/255;
		sizes[ i ] = r;
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
		uniforms:       uniforms,
		vertexShader:  document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		depthTest:   true,
		transparent:   true,
		opacity: 0.5,
		depthWrite: true,
	});
	var particleSystem = new THREE.Points( geometry, shaderMaterial );
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

function render() {
	renderer.render( scene, camera );
}
