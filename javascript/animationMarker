const img  = document.getElementById('bitmap');
// Ensure the image is loaded and ready for use
var imgBitmap = null
createImageBitmap(img).then(x=>{imgBitmap = x});
let play = false

// load model...
let fbxObject = undefined
var loader = new THREE.FBXLoader();
let mixer, animationAction,group
loader.load( '../static/fbx/character.fbx', function ( object ) {
    object.scale.x = 0.0004;
    object.scale.y = 0.0004;
    object.scale.z = 0.0004;
    object.rotation.y = Math.PI
    fbxObject =object
        group = new THREE.Group()
        group.add(fbxObject)

        mixer = new THREE.AnimationMixer(fbxObject)

       
		// fbxObject.position.z = -3;
        
		scene.add( group );
        loader.load( '../static/fbx/animation.fbx', function ( object ) {
    
		// object.scale.x = 0.001;
		// object.scale.y = 0.001;
		// object.scale.z = 0.001;
            animationAction = mixer.clipAction(
                object.animations[0]
            )
            // fbxObject.position.copy( fbxObject.children[0].position.clone().multiplyScalar(-1))
            animationAction.play()
            // fbxObject.position.z = -3;=
            } );
	} );

let clock = new THREE.Clock()

// standard webxr scene

function xwwwform(jsonObject){
	return Object.keys(jsonObject).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(jsonObject[key])).join('&');
}

let camera, scene, renderer, xrRefSpace, gl;

scene = new THREE.Scene();


var ambient = new THREE.AmbientLight( 0x222222 );
scene.add( ambient );
var directionalLight = new THREE.DirectionalLight( 0xdddddd, 1.5 );
directionalLight.position.set( 0.9, 1, 0.6 ).normalize();
scene.add( directionalLight );
var directionalLight2 = new THREE.DirectionalLight( 0xdddddd, 1 );
directionalLight2.position.set( -0.9, -1, -0.4 ).normalize();
scene.add( directionalLight2 );


camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 20000 );
renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = window.innerWidth / window.innerHeight;
renderer.setSize(window.innerWidth, window.innerHeight );
camera.updateProjectionMatrix();
document.body.appendChild( renderer.domElement );	
renderer.xr.enabled = true;

function init() {
	window.addEventListener( 'resize', onWindowResize, false );
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
            requiredFeatures: ['dom-overlay','image-tracking'],
            trackedImages: [
              {
                image: imgBitmap,
                widthInMeters: 0.05
              }
            ],
            domOverlay: { root: document.body }
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

			const results = frame.getImageTrackingResults();
			for (const result of results) {
			  // The result's index is the image's position in the trackedImages array specified at session creation
			  const imageIndex = result.index;
			
			  // Get the pose of the image relative to a reference space.
			  const pose1 = frame.getPose(result.imageSpace, xrRefSpace);
			  pos = pose1.transform.position
			  quat = pose1.transform.orientation
              console.log('found')

			  group.position.copy( pos.toJSON())
            //   this needs to be a projection downwards
			  group.quaternion.copy(quat.toJSON())
			  const state = result.trackingState;
			
			  if (state == "tracked") {
				// HighlightImage(imageIndex, pose1);
			  } else if (state == "emulated") {
				// FadeImage(imageIndex, pose1);
			  }
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
	var delta = clock.getDelta();
	if ( mixer ) mixer.update( delta );
	renderer.render( scene, camera );
}


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())

