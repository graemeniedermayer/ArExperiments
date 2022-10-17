let scene, uniforms, renderer, camera, gl, shaderMaterial;
      // XR globals.
      let xrButton = null;
      let xrRefSpace = null;

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
	    // var particles = 20*10*150;
	    var baseColor = new THREE.Color(0xffffff );
	    uniforms = {
	    	color:     { value: baseColor },
			uRawValueToMeters: {value:0.0010000000474974513},
			uDepthTexture: {value: new THREE.DataTexture()},
			coordTrans: {value: new THREE.Vector2()}
			
	    };
	    shaderMaterial = new THREE.ShaderMaterial( {
	    	uniforms:       uniforms,
	    	vertexShader:  document.getElementById( 'vertexShader' ).textContent,
	    	fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
	    	depthTest:   true,
	    	transparent:   true,
	    	opacity: 0.5,
	    	depthWrite: true,
	    });
		// shaderMaterial.uniforms.uDepthTexture.value.image = new ImageData( 90, 160)
	    const geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
	    var material = new THREE.MeshBasicMaterial( { color: "rgb(100, 100, 250)"} );
        let cube = new THREE.Mesh( geometry, shaderMaterial );
        cube.translateZ(-1)
        scene.add( cube );
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
            if (depthData) {
		shaderMaterial.uniforms.uRawValueToMeters.value = depthData.rawValueToMeters
		shaderMaterial.uniforms.coordTrans.value.x =  -1/viewport.width
		shaderMaterial.uniforms.coordTrans.value.y = -1/viewport.height
		shaderMaterial.uniforms.uDepthTexture.value = new THREE.DataTexture(new Uint8Array(depthData.data), depthData.width, depthData.height, THREE.LuminanceAlphaFormat)
		shaderMaterial.uniforms.uDepthTexture.value.magFilter = THREE.LinearFilter		
		shaderMaterial.needsUpdate = true
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
      
