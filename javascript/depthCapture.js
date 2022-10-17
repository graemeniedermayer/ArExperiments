let scene, uniforms, renderer, camera, gl, shaderMaterial,imgData;
      // XR globals.
      let xrButton = null;
      let xrRefSpace = null;
let captureNext = false;
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
document.getElementById('captureButton').addEventListener('click',()=>{
	captureNext = true;
})
getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 512;
	canvas.height= 512;
	let el = document.createElement('div');
	// el.style.position
	el.style.position= 'relative';
	el.style.height= window.innerWidth + 'px' 
	el.style.width= window.innerHeight + 'px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
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
	    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 10 );
	    renderer = new THREE.WebGLRenderer( { antialias: true } );
	    light = new THREE.PointLight( 0xffffff, 1 );
	    light.distance = 2;
	    var ambient = new THREE.AmbientLight( 0x222222 );
	    scene.add( ambient );
	    var directionalLight = new THREE.DirectionalLight( 0xdddddd, 3 );
	    directionalLight.position.set( 0.9, 1, 0.2 ).normalize();
	    scene.add( directionalLight );
	    var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, .5 );
	    directionalLight2.position.set( -0.9, -1, -0.2 ).normalize();
	    scene.add( directionalLight2 );
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
          requiredFeatures: ['depth-sensing', 'dom-overlay'],
          domOverlay: { root: document.body },
		  depthSensing: {
		    usagePreference: ["cpu-optimized", "gpu-optimized"],
		    dataFormatPreference: ["luminance-alpha","float32"]
		  }
        };
		var sessionInit = getXRSessionInit( 'immersive-ar', {
			mode: 'immersive-ar',
			referenceSpaceType: 'local', // 'local-floor'
			sessionInit: options
		});
		navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted ).catch(onSessionCatch);
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

            const depthData = frame.getDepthInformation(view);
            if (depthData && captureNext) {
				captureNext = false
				let scaleGeo = Math.sin( 2*Math.PI*camera.fov/(2*360) )
				let whratio = viewport.width/viewport.height

                const geometry = new THREE.PlaneGeometry( scaleGeo, scaleGeo*whratio, depthData.height, depthData.width);
				
				data = new Uint8Array(depthData.data)
				// create a plane
				let canvas = getCanvas()

				canvas.width = depthData.width;
				canvas.height= depthData.height;
				let ctx = canvas.getContext('2d');
    			ctx.imageSmoothingEnabled = false;
				imgData = ctx.createImageData(depthData.width, depthData.height);

				// normalized values 
				let cap = 5
				let capFunc = (r,l)=> 1/cap*Math.min(cap,(r+l*255)*depthData.rawValueToMeters)
				for (var i=0, j=0, l = data.length;j < data.length;j+=2, i+=4) {
					// contours
				    // imgData.data[i]   = data[j+1];   //red
				    // imgData.data[i+1] = data[j]; //green
				    // imgData.data[i+2] = data[j]; //blue
				    // imgData.data[i+3] = 255; //alpha
					let [red, green, blue] = hslToRgb(capFunc(data[j], data[j+1]), 0.8, 0.8)
					imgData.data[i]   = red
				    imgData.data[i+1] = green
				    imgData.data[i+2] = blue
				    imgData.data[i+3] = 255; //alpha
				}
				ctx.putImageData(imgData,0,0);
				let texture = new THREE.Texture(imgData)
				texture.needsUpdate = true
				mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { map: texture } ) );

				mesh.quaternion.copy(camera.quaternion)
				mesh.position.copy(camera.position)
				mesh.position.add(new THREE.Vector3(0,0,-1.3).applyQuaternion(camera.quaternion))
				mesh.rotateZ(Math.PI/2)
				scene.add( mesh );
				// maybe?
				var dataURL = canvas.toDataURL("image/png");
				var dataEle = document.createElement("a")
    			dataEle.download = `${camera.position.toArray()}-${camera.quaternion.toArray()}.png`;
    			dataEle.href = dataURL;
    			dataEle.click();
    			setTimeout(function() {
    			    window.URL.revokeObjectURL(dataURL);  
    			}, 0); 
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
