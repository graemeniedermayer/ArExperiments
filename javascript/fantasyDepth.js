let scene, uniforms, renderer, light, camera, gl, shaderMaterial, scaleGeo, whratio; 
      // XR globals.
      let xrButton = null;
      let xrRefSpace = null;
let captureNext = false 

createCanvas = (img, width, height) =>{
	let canvas = document.createElement('canvas');
  	canvas.width = width;
	canvas.height= height;
	let el = document.createElement('div');
	// does this need to be appended?
    el.style.position= 'absolute';
	el.style.top= '4000px';
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0,  width, height);
	return ctx
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
  camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.01, 40 );
  
  light = new THREE.PointLight( 0xffffff,3.5 );
  light.decay = 8
  light.distance = 30;
  light.position.x = 0
  light.position.y = .5
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
          requiredFeatures: ['dom-overlay'],
          domOverlay: { root: document.body },
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
	
	light.position.z = -2 - 2*Math.sin(count)
	light.position.x = - 2*Math.cos(count)
	count += 0.02
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

let first = true
let ctxCamera, ctxDepth;
let geometry, mesh, material, texture;
let convRate = 0.05
updateDepth = (texture, depthTexture) => {
	if(!first){
        let depthImage = depthTexture.image
        let camImage = texture.image

		ctxDepth.drawImage(depthImage, 0, 0, depthImage.width, depthImage.height);
        depthData = ctxDepth.getImageData( 0, 0, depthImage.width, depthImage.height)
        
        let whratio = camImage.height / camImage.width

        // recorded fov
        let fov = 80
        let scaleGeo = 2*Math.tan( 2*Math.PI*fov/(2*360) )

		newGeometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, depthData.width-1, depthData.height-1);
		const vertices = newGeometry.attributes.position.array;
        let data = new Uint8Array(depthData.data)
        for ( let  j = 0, k = 0, i = 0, l = data.length; j < l; j+=4, k+=3) {
            zdistance = convRate*data[ j ]
            vertices[ k ] = vertices[ k ]*zdistance;
            vertices[ k + 1 ] = vertices[ k + 1 ]*zdistance ;
            vertices[ k + 2 ] =  - zdistance ;
            i+= 2
        }
		geometry.dispose()
		mesh.geometry = newGeometry
		geometry.needsUpdate = true
		geometry = newGeometry
		
		material.map = texture
		material.needsUpdate = true
	}
    if (first) {
        first = false
        let depthImage = depthTexture.image
        let camImage = texture.image

        ctxCamera = createCanvas(camImage, camImage.width, camImage.height)
        ctxDepth = createCanvas(depthImage, depthImage.width, depthImage.height)
        depthData = ctxDepth.getImageData( 0, 0, depthImage.width, depthImage.height)
        
        let whratio = camImage.height / camImage.width

        // recorded fov
        let fov = 80
        let scaleGeo = 2*Math.tan( 2*Math.PI*fov/(2*360) )
        
        geometry = new THREE.PlaneGeometry(scaleGeo,  scaleGeo*whratio, depthData.width-1, depthData.height-1);
        const vertices = geometry.attributes.position.array;
        let data = new Uint8Array(depthData.data)
        for ( let  j = 0, k = 0, i = 0, l = data.length; j < l; j+=4, k+=3) {
            zdistance = convRate*data[ j ]
            vertices[ k ] = vertices[ k ]*zdistance;
            vertices[ k + 1 ] = vertices[ k + 1 ]*zdistance ;
            vertices[ k + 2 ] =  - zdistance ;
            i+= 2
        }
		material = new THREE.MeshStandardMaterial( { 
            map: texture
        } )
        mesh = new THREE.Mesh( geometry, material);
        scene.add( mesh );
    } 
}

updateScale = ()=>{
	if(!first){
		mesh.scale.x = params.scale
		mesh.scale.y = params.scale
		mesh.scale.z = params.scale
	}
}

files = {
	sd2cyber:["00179-1897534908-.png",
	"00180-1897534908-_depth.png"],
	sd2cyber2:["00182-2118646350-.png",
	"00183-2118646350-_depth.png"],
	sd2fantasyCastle:["00184-83176196-.png",
	"00185-83176196-_depth.png"],
	sd2fantasyCastle2:["00186-235433053-.png",
	"00187-235433053-_depth.png"],
	sd2fantasyCastle3:["00188-1122031921-.png",
	"00189-1122031921-_depth.png"],
	sd2fantasyCastle4:["00190-3419000685-.png",
	"00191-3419000685-_depth.png"],
	sd2fantasyCastle5:["00192-3045558093-.png",
	"00193-3045558093-_depth.png"],
	sd2fantasyCastle6:["00194-2473020156-.png",
	"00195-2473020156-_depth.png"],
	
	fantasyCastle:
		['00210-2877380190-fantasycastle.png',
		'00076-1454487430-castle_depth.png',],
	fantasyCastle2:
		['00212-1568727602-fantasy castle.png',
		'00088-2777588450-castle_depth.png',],
	fantasyMountain: 
		['00214-1044756489-fantasy castle on a mountain top.png',
		'00086-323889892-castle_depth.png',],
	fantasyMountain2:
		['00216-2197333919-fantasy castle on a mountain top.png',
		'00082-376722926-castle_depth.png',],
	elvenWoods:
		['00218-3263570021-elven woods.png',
		'00080-1393410692-castle_depth.png',],
	elvenWoods2:
		['00220-2999067029-elven woods.png',
		'00082-376722926-castle_depth.png',],
	modernCity:
		['00222-485255661-modern city scape.png',
		'00223-485255661-modern city scape_depth.png',],
	cyberpunkCity:
		['00224-1939876255-cyberpunk city.png',
		'00078-3697106439-castle_depth.png',],
	solarpunkCity:
		['00226-1248464761-solarpunk city.png',
		'00227-1248464761-solarpunk city_depth.png',],
	steampunkCity:
		['00228-1309810520-steampunk city.png',
		'00229-1309810520-steampunk city_depth.png',],
	darkElfArmour:
		['00240-3068845015-dark elf armour concept art.png',
		'00241-3068845015-dark elf armour concept art_depth.png',],
	orcaElfArmour:
		['00242-3982403266-orca armour elf concept art.png',
		'00243-3982403266-orca armour elf concept art_depth.png',]

}
fileNames = Object.keys(files)


var button = document.createElement( 'button' );
button.id = 'ArButton'
button.textContent = 'ENTER AR' ;
button.style.cssText+= `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;
    
document.body.appendChild(button)
document.getElementById('ArButton').addEventListener('click',x=>AR())


const zero = new THREE.Vector3(0,0,0) 

// add gui

let gui = new dat.GUI()
let guiSystem = gui.addFolder('options');

let params = {
    //   distance:1.0,
      scale:1.0,
	  fileName: 'sd2cyber'
  }

let texture1, texture2;
  // series loading simple non-optimal
updateTextures = ()=>{
	let nameArray = files[params.fileName]
	new THREE.TextureLoader().load('../data/fantasy/'+nameArray[0], texture=>{
	    texture1 = texture
	    new THREE.TextureLoader().load('../data/fantasy/'+nameArray[1], depthTexture=>{
	        texture2 = depthTexture
	        updateDepth(texture, depthTexture)
	    })
	})
}
updateTextures()



// guiSystem.add(params, "distance", 0.0, 20.0).onChange(
//   updateDepth);
guiSystem.add(params, "scale", 0.0, 2.0).onChange(
    updateScale);
guiSystem.add(params, "fileName", fileNames).onChange(
	updateTextures)
// guiSystem.add(params, "x", -20.0, 20.0).onChange(
//     updatePos);

// guiSystem.add(params, "y", -20.0, 20.0).onChange(
//     updatePos);

// guiSystem.add(params, "x", -20.0, 20.0).onChange(
//     updatePos);


// todo future integrate user uploads

// function uploadFile(files, system, imageName){
// 	if(files){
// 		for (let i = 0; i < files.length; i++) {
// 		// doesn't this only use the last image
//     	  if (files[i].type.match(/^image\//)) {
// 			      file = files[i];
//             const url = URL.createObjectURL(file); // this points to the File object we just created
//             document.getElementById(imageName).src = url;
//     	  }
//     	}
// 	}
// 	let texture = new THREE.Texture(document.getElementById(imageName))	

//   system.material_.uniforms.diffuseTexture.value.image = texture.image
//   system.material_.uniforms.diffuseTexture.value.needsUpdate=true
// }

// document.getElementById('file1').addEventListener('change', (e) => uploadFile(e.target.files, partSystem1, 'image1')); 
// document.getElementById('file2').addEventListener('change', (e) => uploadFile(e.target.files, partSystem2, 'image2')); 
// document.getElementById('file3').addEventListener('change', (e) => uploadFile(e.target.files, partSystem3, 'image3')); 
