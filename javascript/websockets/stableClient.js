// okay so I know global are bad practice but this is experimental oookay?
let scene, geometry, uniforms, renderer, light, cameraCopy, camera, minSize, image1, camBinding, gl, texture1, viewport, shaderMaterial, scaleGeo, whratio, glBinding, dcamera, ctx, shaderProgram, mesh; 
      // XR globals.
    
let canvasSize = {'width':512,'height':1024}
let cutRatio = 0;
let image = {data:''}
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
// greyScale
function greyScale(image){
    
    const newImage = new Uint8Array(image.length/ 4);
    for(let i= 0; i< image.length; i+=4){
        newImage[i/4] = 0.299 * image[i] + 0.587 * image[i+1] + 0.114 * image[i+2]
        // could be multiplied to for alpha image[i+3]
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
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.001, 20 );
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

}

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
            viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y,
                        viewport.width, viewport.height);
            const depthData = frame.getDepthInformation(view); 
            if (view.camera &&  depthData && captureClick) {
                captureClick = false
				dcamera = view.camera
				camBinding = glBinding.getCameraImage(dcamera);
				texture1 = drawCameraCaptureScene(gl, camBinding,  dcamera.width, dcamera.height)
				
                shape = JSON.stringify([dcamera.width, dcamera.height])
                // fine..
                camCanvas.height=dcamera.height
                camCanvas.width = dcamera.width
                ctxCamera = camCanvas.getContext('2d');
                image1 = new ImageData(new Uint8ClampedArray(texture1), dcamera.width)
                image = ctxCamera.putImageData( image1,0,0,0,0, dcamera.width, dcamera.height)
                let hw = dcamera.height / dcamera.width
                // TODO generalize
                if (hw > 2){
                    minSize = dcamera.height - 2*dcamera.width
                    cutRatio = 1-(minSize/dcamera.height)
                    image = ctxCamera.drawImage(camCanvas, 0, minSize/2, dcamera.width, dcamera.height-minSize, 0, 0, canvasSize.width, canvasSize.height)
                }else{
                    minSize = dcamera.width - 2*dcamera.height
                    cutRatio = 1-(minSize/dcamera.width)
                    image = ctxCamera.drawImage(camCanvas, minSize/2, 0, dcamera.width-minSize, dcamera.height, 0, 0, canvasSize.height, canvasSize.width)
                }

                whratio = 1/2
                console.log(dcamera.height)
                console.log(dcamera.width)
                console.log(depthData.height)
                console.log(depthData.width)
                console.log( parseInt(depthData.height*cutRatio) )
                skipIndex = 2*(parseInt(depthData.height*(1-cutRatio))/2 * depthData.width)
                console.log(skipIndex)
				scaleGeo = 2*Math.tan( 2*Math.PI*camera.fov*cutRatio/(2*360) )
                geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, depthData.width-1, parseInt(depthData.height*cutRatio)-1);
				const vertices = geometry.attributes.position.array;
				let data = new Uint8Array(depthData.data)
				let convRate = depthData.rawValueToMeters
				for ( let  j = skipIndex, k = 0, i = skipIndex, l = data.length-skipIndex; j < l; j+=2, k+=3) {
					zdistance = convRate*(data[ i ]+data[ i+1 ]*255)
					// near frucrum is camera plane?
					vertices[ k ] = vertices[ k ]*zdistance;
					vertices[ k + 1 ] = vertices[ k + 1 ]*zdistance ;
					vertices[ k + 2 ] =  - zdistance ;
					i+= 2

				}
                let imageData = ctxCamera.getImageData(0, 0, canvasSize.width, canvasSize.height).data
        
				mesh = new THREE.Mesh( geometry, new THREE.ShaderMaterial() );
				mesh.material = new THREE.ShaderMaterial( { 
					uniforms : {
						uSampler: { value: new THREE.DataTexture(imageData, canvasSize.width, canvasSize.height) },
						coordTrans: {value:{
							x:1/canvasSize.width,
							y:1/canvasSize.height
						}}
					},
					vertexShader:  document.getElementById( 'vertexShader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				} )
				cameraCopy = new THREE.Group()

				cameraCopy.quaternion.copy(camera.quaternion)
				cameraCopy.position.copy(camera.position)
				mesh.quaternion.copy(camera.quaternion)
				mesh.position.copy(camera.position)
				mesh.rotateZ(3*Math.PI/2)
				// mesh.material.wireframe = true
				scene.add( mesh );
                
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


let recData
document.getElementById('channelSubmit').addEventListener('click',e=>{
	let channelName = document.getElementById('channelName');
	document.getElementById('channelSubmit').style.display = 'none';
	channelName.style.display = 'none';
	// let qrImg = new QRCode(document.getElementById("qrCode"), channelName.value);
	// createImageBitmap(qrImg._oDrawing._elCanvas).then(x=>{imgBitmap = x});
	socket = new ReconnectingWebSocket(`wss://servername.com/ws/stableClient/${channelName.value}`, null ,{
	  timeoutInterval: 2000, 
	  maxReconnectAttempts: 10, 
	  binaryType: 'arraybuffer'
	})
	socket.onmessage = e=>{
		let data = JSON.parse(e.data).data
        recData = data
        if(data){
            // camCanvas.height=dcamera.height
            // camCanvas.width = dcamera.width
            // ctxCamera = camCanvas.getContext('2d');
            // let image1 = new ImageData(new Uint8ClampedArray(data), minSize)
            // image = ctxCamera.putImageData( image1, 0, 0, 0, 0, 512, 512)
            // let hw = dcamera.height / dcamera.width
            // if (hw > 1){
            //     image = ctxCamera.putImageData( image1, 0, 0, 0, 0, dcamera.width, dcamera.height)
            // }else{
            //     image = ctxCamera.putImageData( image1, 0, 0, 0, 0, dcamera.width, dcamera.height)
            // }
			
			// mesh.material.uSampler.value = new THREE.DataTexture(image, dcamera.width, dcamera.height) 
            mesh.visible = false
            let mesh1 = new THREE.Mesh( mesh.geometry.clone(), new THREE.ShaderMaterial() );
			mesh1.material = new THREE.ShaderMaterial( { 
                side: 2,
				uniforms : {
					uSampler: { value: new THREE.DataTexture(new Uint8Array(recData), canvasSize.width, canvasSize.height) },
					coordTrans: {value:{
						x:1/canvasSize.width,
						y:1/canvasSize.height
					}}
				},
				vertexShader:  document.getElementById( 'vertexShader1' ).textContent,
				fragmentShader: document.getElementById( 'fragmentShader1' ).textContent,
			} )
			
			mesh1.quaternion.copy(cameraCopy.quaternion)
			mesh1.position.copy(cameraCopy.position)
            mesh1.rotateZ(3*Math.PI/2)
			// mesh1.rotateY(Math.PI)
			// m1esh.material.wireframe = true
			scene.add( mesh1 );
        }
	}
    document.getElementById('promptSubmit').addEventListener('click',()=>{
        // 
        let imageData = ctxCamera.getImageData(0, 0, canvasSize.width, canvasSize.height).data
        socket.send(JSON.stringify({
            prompt:document.getElementById('promptName').value,
            image:Array.from(imageData)
        }))
    })
    
  })
