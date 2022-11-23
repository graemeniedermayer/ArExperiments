
let scene, uniforms, renderer, light, camera, camBinding;
let gl, texture1, shaderMaterial, scaleGeo, whratio;
let glBinding, dcamera, shaderProgram; 
// XR globals.
let xrButton = null;
let xrRefSpace = null;
let captureNext = false 
let firstDepth = true
let imageArray = []
let canvasSize = {'width':512,'height':1024}
let clock = new THREE.Clock()
let imageIndex = 0

const date = new Date();

let day = date.getDate();
let month = date.getMonth() + 1;
let year = date.getFullYear();
let time = date.getTime();

let currentDate = `${day}-${month}-${year}-${time}`;
let fileString = ''

var encoder = new Whammy.Video(15); 
var depthEncoder = new Whammy.Video(15); 
// function getBase64Image(img) {
// 	var canvas = document.createElement("canvas");
// 	canvas.width = img.width;
// 	canvas.height = img.height;
// 	var ctx = canvas.getContext("2d");
// 	ctx.drawImage(img, 0, 0);
// 	var dataURL = canvas.toDataURL("image/png");
// 	return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
//   }
// //   blobbing 
// u8intToBlob = data => new Blob([data.buffer])

getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 512;
	canvas.height= 512;
	let el = document.createElement('div');
	// el.style.position
	el.style.position= 'absolute';
	el.style.top= '4000px';
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}
let camCanvas = getCanvas()
let depthCanvas = getCanvas()

function cloneCanvas(oldCanvas) {

    //create a new canvas
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

	ctxCamera.translate(0, dcamera.height);
	ctxCamera.scale(1,-1);
	

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
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
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 10 );
  // var particles = 20*10*150;

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  // renderer.gammaOutput = true;
  document.body.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );


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
	function onSessionCatch(error){
		let errorEle = document.getElementById('errorMessage')
		if(!errorEle){
			errorEle = document.createElement( 'div' );
			errorEle.id = 'errorMessage'
			errorEle.innerHTML = error.message ;
			errorEle.style.cssText+= `position: absolute;top:1rem;left:1rem;width:auto;height:auto;background:black;color:white;`;
			document.body.appendChild(errorEle)
		}else{
			errorEle.innerHTML += '<br>'+ error.message ;
		}
		console.error(error)
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
		navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted ).catch( onSessionCatch );
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
	
	return data
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
            const depthData = frame.getDepthInformation(view); 
            if (view.camera && depthData && captureNext) {

				imageIndex += 1

				// captureNext =false
				dcamera = view.camera
				camBinding = glBinding.getCameraImage(dcamera);
				texture1 = drawCameraCaptureScene(gl, camBinding,  dcamera.width, dcamera.height)

				let convRate = depthData.rawValueToMeters
				// cutting

				ctxCamera = camCanvas.getContext('2d');
				camCanvas.height= dcamera.height
                camCanvas.width = dcamera.width
                image1 = new ImageData(new Uint8ClampedArray(texture1), dcamera.width)
                image = ctxCamera.putImageData( image1,0,0,0,0, dcamera.width, dcamera.height)
				
                let hw = dcamera.height / dcamera.width

				ctxDepth = depthCanvas.getContext('2d');
				// deep questions
				depthCanvas.height=depthData.height 
                depthCanvas.width = depthData.width

               
				let data = new Uint8Array(depthData.data)

				let whratio = 1/2
                // let skipIndex = 2*(parseInt(depthData.height*(1-cutRatio))/2 * depthData.width)
                let scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov/(2*360) )
                
				depthArray = ctxDepth.createImageData(depthData.width, depthData.height);
				for ( let  k = 0, i = 0, l = data.length; i < l; i+= 2, k+=4) {
					depthArray.data[k]   = data[ i ]
				    depthArray.data[k+1] = data[ i+1 ] 
				    depthArray.data[k+2] = 150;
				    depthArray.data[k+3] = 255; //alpha
					
				}

				depthimage = ctxDepth.putImageData( depthArray,0,0,0,0, depthData.width, depthData.height)     
				
				cloneCam = cloneCanvas(camCanvas)
				ctxCloneCam = cloneCam.getContext('2d')
				ctxCloneCam.translate(0, dcamera.height);
				ctxCloneCam.scale(1,-1);
				ctxCloneCam.drawImage(cloneCam, 0, 0);
				cloneDepth = encoder.add(cloneCam);

				cloneDepth = cloneCanvas(depthCanvas)
				ctxCloneDepth = cloneDepth.getContext('2d')
				ctxCloneCam.translate(depthData.width, 0);
				ctxCloneDepth.rotate(Math.PI / 2);
				ctxCloneDepth.drawImage(cloneDepth, 0, 0);  
				depthEncoder.add(cloneDepth);

				if(firstDepth){
					intrinsics = {
					
						// depthImageSize: [ depthData.width, parseInt(depthData.height*cutRatio)],
						depthImageSize: [ depthData.width, parseInt(depthData.height)],
						imageSize: [ canvasSize.width, canvasSize.height],
						geometricScale: scaleGeo,
					}
					// depthImageSize:[${depthData.width},${parseInt(depthData.height*cutRatio)}],
					fileString+= `intrinsics:{
						depthImageSize:[${depthData.width},${parseInt(depthData.height)}],
						imageSize: [ ${canvasSize.width}, ${canvasSize.height}],
						geometricScale: ${scaleGeo}
					}`
					firstDepth= false
				}else{
					fileString += `${camera.position.toArray()},${camera.quaternion.toArray()};`
				}
				// this is probably going to trigger chrome.....

            } else {
              console.log('unavailable')
			}
        }
	}
}

// activation


function animate() {
	renderer.setAnimationLoop( render );
}

function render() {
    // record ever frame?
	renderer.render( scene, camera );
}

animate(); 

// imageArray.push(image)

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
  
let captureButton = document.getElementById('captureImage').addEventListener('click',()=>{
	captureNext = true;
    
    // save image
})

document.getElementById('downloadImage').addEventListener('click',()=>{
	captureNext = false;
	var file = new Blob([fileString], {type : 'text/html'}); 
	var a = document.createElement("a");
    var url = URL.createObjectURL(file);
    a.href = url;
    a.download = `${currentDate}_${imageIndex}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0); 

	encoder.compile(false, function(output){
		var url = (window.webkitURL || window.URL).createObjectURL(output);
		var dataEle = document.createElement("a")
		dataEle.download = `${currentDate}_${imageIndex}.webm`;
    	dataEle.href = url;
    	dataEle.click();
		depthEncoder.compile(false, function(output){
			var url = (window.webkitURL || window.URL).createObjectURL(output);
			var dataDepth = document.createElement("a")
			dataDepth.download = `${currentDate}_${imageIndex}_depth.webm`;
			dataDepth.href = url;
			dataDepth.click();
		});
	});
})
