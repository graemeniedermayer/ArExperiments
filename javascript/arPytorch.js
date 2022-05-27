let scene, uniforms, renderer, light, camera, camBinding, gl, texture1, shaderMaterial, scaleGeo, whratio, glBinding, dcamera, ctx, shaderProgram, mesh; 
      // XR globals.
      let captureClick;
      let xrButton = null;
      let xrRefSpace = null;
let captureNext = true
getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 512;
	canvas.height= 512;
	let el = document.createElement('div');
	// el.style.position
	el.style.position= 'relative';
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}
function hslToRgb(h, s, l){//from stackoverflow
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


function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
}
// expect flat image
function greyScale(image){
    
    const newImage = new Uint8Array(image.length/ 4);
    for(let i= 0; i< image.length; i+=4){
        newImage[i/4] = 0.299 * image[i] + 0.587 * image[i+1] + 0.114 * image[i+2]
        // could be multiplied to for alpha image[i+3]
    }
    return newImage
}
// expect flat greyscale image640x192
function downScale( image, originalWidth, originalHeight, goalWidth = 640, goalHeight = 192){
    // averageMath
    heightRatio = originalWidth / goalWidth
    widthRatio = originalHeight/goalHeight
    const newImage = new Uint8Array(goalWidth*goalHeight);
    for(let i=0; i < goalWidth; i++){
        for(let l = 0; l<goalHeight; l++){
            sum = 0
            count = 0
            for(let k=0; k<heightRatio; k++){
                for(let j=0; j<widthRatio; j++){
                    try{
                    sum += image[ 
                        (Math.round(i*heightRatio) + j)*originalHeight + 
                        (Math.round(l*widthRatio) + k)]
                    count+=1
                    }catch(e){
                        // non indexed
                    }
                }
            }
            newImage[i+goalWidth*l] = sum/count
        }
    }
    
    return newImage
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
function init(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 10 );
  // var particles = 20*10*150;
  light = new THREE.PointLight( 0xffffff,1.5 );
  light.decay = 1
  light.distance = 30;
  light.position.x = 0
  light.position.y = 1.5
  light.position.z = -1.2
  scene.add(light)
  var ambient = new THREE.AmbientLight( 0x222222 );
  scene.add( ambient );
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  // renderer.gammaOutput = true;
  document.body.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );

  whratio = window.innerWidth/ window.innerHeight 
  scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(2*360) )
  const geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, window.innerWidth, window.innerHeight );

  let canvas = getCanvas()

  canvas.width = 192;
  canvas.height= 640;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
  scene.add(mesh)
}
updateFunction = (image, imageWidth, imageHeight)=>{
	// size oe

    
    geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, imageWidth, imageHeight );
    
    imgData = ctx.createImageData(imageWidth, imageHeight);
    imgData.data = Uint8Array.from(image)
    for(let i=0; i<imageWidth*imageHeight; i++){
        imgData.data[4*i]   = image[i] 
        imgData.data[4*i+1] = image[i]
        imgData.data[4*i+2] = image[i]
        imgData.data[4*i+3] = 255
    }
    // mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial({map: new THREE.Texture(imgData)}) );
    mesh = new THREE.Mesh( geometry, new THREE.ShaderMaterial() );
    mesh.material = new THREE.ShaderMaterial( { 
        uniforms : {
            uSampler: { value: new THREE.DataTexture(imgData.data, imageWidth, imageHeight) },
            coordTrans: {value:{
                x:1/imageWidth,
                y:1/imageHeight
            }}
        },
        vertexShader:  document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
    } )
    mesh.quaternion.copy(camera.quaternion)
    mesh.position.copy(camera.position)
    mesh.position.add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion))
    mesh.rotateZ(3*Math.PI/2)
    scene.add( mesh );
}

updateServer = (pose, image) => fetch('https://compute.ca/pyTorch/',{
        method: 'POST',
        body: xwwwform({
            'pose':pose,
            'image': JSON.stringify(Array.from(image) )
        }),
        mode:'cors',  
        headers: {
            'X-Requested-With':'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(x=>x.json())
    .then(x=>{
        let [spectra, imageWidth, imageHeight] = x

		spec = spectra.map(x=>12*parseFloat(x))
        updateFunction(spec, imageWidth, imageHeight)
        captureNext = true

    }).catch(x=>console.log(x))


function AR(){
	var currentSession = null;
	function onSessionStarted( session ) {
		session.addEventListener( 'end', onSessionEnded );
		renderer.xr.setSession( session );
		gl = renderer.getContext()
		gl.makeXRCompatible().then(x=>{
			// could lead to race condition
			initCameraCaptureScene(gl)
			glBinding = new XRWebGLBinding(session, gl);
		})
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
          requiredFeatures: ['depth-sensing', 'dom-overlay', 'camera-access'],
          domOverlay: { root: document.body },
		  depthSensing: {
		    usagePreference: [ "cpu-optimized"],
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
function initCameraCaptureScene(gl) {
    var vertices = [
        -1.0, 1.0, 0.0
    ];

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var vertCode =
    'attribute vec3 coordinates;' +
    'void main(void) {' +
        'gl_Position = vec4(coordinates, 1.0);' +
        'gl_PointSize = 1.0;'+
    '}';
    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    // NOTE: we must explicitly use the camera texture in drawing,
    // otherwise uSampler gets optimized away, and the
    // camera texture gets destroyed before we could capture it.
    var fragCode =
    'uniform sampler2D uSamples;' +
    'void main(void) {' +
        'gl_FragColor = texture2D(uSamples, vec2(0,0));' +
    '}';
    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    aCoordLoc = gl.getAttribLocation(shaderProgram, "coordinates");
    uSamplerLoc = gl.getUniformLocation(shaderProgram, "uSamples");
	uSamplerLocs = gl.getUniformLocation(shaderProgram, "uSampler");

    let glError = gl.getError();
    if (glError!= gl.NO_ERROR) {
        console.log("GL error: " + glError);
    }
}
function drawCameraCaptureScene(gl, cameraTexture, width, height) {
    const prevShaderId = gl.getParameter(gl.CURRENT_PROGRAM);

    gl.useProgram(shaderProgram);

    // Bind the geometry
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(aCoordLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aCoordLoc);

    // Bind the texture to 
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
    gl.uniform1i(uSamplerLoc, 1);

    // Draw the single point
    gl.drawArrays(gl.POINTS, 0, 1);
	
    const prev_framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING); // save the screen framebuffer ID

    // Create a framebuffer backed by the texture
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cameraTexture, 0);

    // Read the contents of the framebuffer
    const data = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.deleteFramebuffer(framebuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, prev_framebuffer); // bind back the screen framebuffer

	texture1 = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture1);
	gl.uniform1i(uSamplerLocs, 0);
	const level = 1;
	const internalFormat = gl.RGBA;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = data;  
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				  width, height, border, srcFormat, srcType,
				  pixel);

	gl.useProgram(prevShaderId);
	// returns a Uint8Array
	return data 
}
count = 0
function onXRFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);
	render()
	light.position.z = -3 - 2*Math.sin(count)
	count += 0.02
	if (pose) {
		for (const view of pose.views) {
            const viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
            if (view.camera &&  captureNext && captureClick) {
				captureNext =false
                captureClick = false
				dcamera = view.camera
				camBinding = glBinding.getCameraImage(dcamera);
				texture1 = drawCameraCaptureScene(gl, camBinding,  dcamera.width, dcamera.height)
				
                shape = JSON.stringify([dcamera.width, dcamera.height])
                // fine..
				updateServer(shape, 
                    downScale( greyScale(texture1), dcamera.height, dcamera.width, 640, 192))
            } else {
              console.log('unavailable')
			}
        }
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
init()
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

document.getElementById('captureButton').addEventListener('click',()=>{
	captureClick = true;
})
