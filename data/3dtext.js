// This is a messy file clean it up.
let  {MeshBasicMaterial, PlaneBufferGeometry,Texture, NormalBlending, Mesh} = THREE
var isFloat = function (input) { return !isNaN(parseFloat(input)); };
var cross = function (vec1, vec2) {
    return [
        vec1[1] * vec2[2] - vec1[2] * vec2[1],
        vec1[2] * vec2[0] - vec1[0] * vec2[2],
        vec1[0] * vec2[1] - vec1[1] * vec2[0]
    ];
};
class TextCanvas{

 	constructor( options ){
	let canvasDepth = this.canvasDepth = isFloat(options.geotype.canvasDepth) ? options.geotype.canvasDepth : -0.5;
	let canvasHeight = this.canvasHeight = isFloat(options.geotype.canvasHeight) ? options.geotype.canvasHeight : 0.2;
	let scaleCanvas = this.scaleCanvas = isFloat(options.geotype.scaleCanvas) ? options.geotype.scaleCanvas : 5.0;
	let upDownOffset = this.upDownOffset = isFloat(options.geotype.upDownOffset) ? options.geotype.upDownOffset : 0.00;
	let rightLeftOffset = this.rightLeftOffset = isFloat(options.geotype.rightLeftOffset) ? options.geotype.rightLeftOffset : 0.00;
	// UGH
	let string = this.string = options.string;
	let fontsize = this.fontsize = options.fontsize/2 || 50;
	let stringlen = this.stringlen = string.length;
	this.lineHeight = options.lineHeight || 50;
	let loc1,loc2;
	let x3,y3,z3;
	loc1 = this.loc1 = options.loc1;
	loc2 = this.loc2 = options.loc2;
	let x2 = loc2[0];
	let y2 = loc2[1];
	let z2 = loc2[2];
	let x1 = loc1[0];
	let y1 = loc1[1];
	let z1 = loc1[2];
	let x4 = 0;
	let y4 = 1;
	let z4 = 0;
	let loc5 = cross( [x1 -loc2[0], y1 -loc2[1], z1 -loc2[2]], [x4, y4, z4] );
	let x5 = loc5[0]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let y5 = loc5[1]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let z5 = loc5[2]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let loc3 = cross( [x5, y5, z5], [x1-loc2[0], y1-loc2[1], z1-loc2[2]] );
	x3 = loc3[0]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
	y3 = loc3[1]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
	z3 = loc3[2]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
	var canvas = this.canvas = document.createElement('canvas');
	var planeGeo = this.planeGeo = new PlaneBufferGeometry( 6, 4.6 );
	planeGeo.attributes.position.array[0] = 0 + scaleCanvas * 0.25 * 1 ;
	planeGeo.attributes.position.array[1] = 0 + upDownOffset +  scaleCanvas * (0.45 - canvasHeight);
	planeGeo.attributes.position.array[2] = 0 - canvasDepth + rightLeftOffset;
	planeGeo.attributes.position.array[6] = 0 + scaleCanvas * 0.25;
	planeGeo.attributes.position.array[7] = 0 + upDownOffset + scaleCanvas * (0.325 - canvasHeight);
	planeGeo.attributes.position.array[8] = 0 - canvasDepth + rightLeftOffset;
	planeGeo.attributes.position.array[3] = 0 - scaleCanvas * 0.25 ;
	planeGeo.attributes.position.array[4] = 0 + upDownOffset + scaleCanvas * (0.45 - canvasHeight);
	planeGeo.attributes.position.array[5] = 0 - canvasDepth + rightLeftOffset;
	planeGeo.attributes.position.array[9] = 0 - scaleCanvas * 0.25;
	planeGeo.attributes.position.array[10]= 0 + upDownOffset+ scaleCanvas * (0.325 - canvasHeight);
	planeGeo.attributes.position.array[11]= 0 - canvasDepth + rightLeftOffset ;
	planeGeo.computeBoundingBox(); // for hit area
	canvas.width = 1024;
	canvas.height = 256;
	var ctx = this.ctx = canvas.getContext('2d');
	// Resize long st
	if (stringlen>8){
	  this.fontsize = this.fontsize * ((7/stringlen) + 1/8) ;
	}
	ctx.font = this.fontsize + 'px Quicksand';
	var texture = this.texture = new Texture( canvas );
	texture.needsUpdate = true;
  
	var planeMat = this.planeMat = new MeshBasicMaterial({
	  map: texture,
	  //color: 0xffffff,
	  blending : NormalBlending,
		  depthTest:   true,
		  transparent:   true,
		  depthWrite: true
	});
  
	var plane = this.plane = new Mesh( planeGeo, planeMat );
	plane.position.set(x1, y1, z1)
	// x5, x3
	// plane.quaternion.setFromUnitVectors(new THREE.Vector3(x4, y4, z4).normalize(),new THREE.Vector3(x1, y1, z1).normalize())
	texture.needsUpdate = true;
	this.update();
	return this
}
  updateLoc(newLocation) {
	let {canvasDepth, canvasHeight, scaleCanvas, upDownOffset, rightLeftOffset, loc2} = this;
	let loc1,x1,y1,z1;
	let x3,y3,z3;
	loc1 = newLocation;
	if(loc1[0].toFixed(5)==loc2[0].toFixed(5)&&
	   loc1[1].toFixed(5)==loc2[1].toFixed(5)&&
	   loc1[2].toFixed(5)==loc2[2].toFixed(5)){
		x1 = 2 * loc1[0];//Math.sqrt(loc1[0]*loc1[0]+loc1[1]*loc1[1]+loc1[2]*loc1[2]);
		y1 = 2 * loc1[1];//Math.sqrt(loc1[0]*loc1[0]+loc1[1]*loc1[1]+loc1[2]*loc1[2]);
		z1 = 2 * loc1[2];//Math.sqrt(loc1[0]*loc1[0]+loc1[1]*loc1[1]+loc1[2]*loc1[2]);
	}else{
		x1 = loc1[0];
		y1 = loc1[1];
		z1 = loc1[2];
	}
	let x4 = 0;
	let y4 = 1;
	let z4 = 0;
	let loc5 = cross( [x1 -loc2[0], y1 -loc2[1], z1 -loc2[2]], [x4, y4, z4] );
	let x5 = loc5[0]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let y5 = loc5[1]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let z5 = loc5[2]/Math.sqrt(loc5[0] * loc5[0] + loc5[1] * loc5[1] + loc5[2] * loc5[2]);
	let loc3 = cross( [x5, y5, z5], [x1-loc2[0], y1-loc2[1], z1-loc2[2]] );
	x3 = loc3[0]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
	y3 = loc3[1]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
	z3 = loc3[2]/Math.sqrt(loc3[0] * loc3[0] + loc3[1] * loc3[1] + loc3[2] * loc3[2]);
  
	if(loc1[0].toFixed(5)==loc2[0].toFixed(5)&&
	   loc1[1].toFixed(5)==loc2[1].toFixed(5)&&
	   loc1[2].toFixed(5)==loc2[2].toFixed(5)){
		x1 = loc1[0];
		y1 = loc1[1];
		z1 = loc1[2];
	}
	var canvas = this.canvas;
	var planeGeo = this.planeGeo;
	//if(y1>0){
	planeGeo.attributes.position.array[0] = x1 - canvasDepth + scaleCanvas * 0.25 * x5 + scaleCanvas * (0.45 - canvasHeight) * x3;
	planeGeo.attributes.position.array[1] = y1 + upDownOffset + scaleCanvas * 0.25 * y5 + scaleCanvas * (0.45 - canvasHeight) * y3;
	planeGeo.attributes.position.array[2] = z1 + rightLeftOffset + scaleCanvas * 0.25 * z5 + scaleCanvas * (0.45 - canvasHeight) * z3;
	planeGeo.attributes.position.array[6] = x1 - canvasDepth + scaleCanvas * 0.25 * x5 + scaleCanvas * (0.325 - canvasHeight) * x3;
	planeGeo.attributes.position.array[7] = y1 + upDownOffset + scaleCanvas * 0.25 * y5 + scaleCanvas * (0.325 - canvasHeight) * y3;
	planeGeo.attributes.position.array[8] = z1 + rightLeftOffset + scaleCanvas * 0.25 * z5 + scaleCanvas * (0.325 - canvasHeight) * z3;
	planeGeo.attributes.position.array[3] = x1 - canvasDepth - scaleCanvas * 0.25 * x5 + scaleCanvas * (0.45 - canvasHeight) * x3;
	planeGeo.attributes.position.array[4] = y1 + upDownOffset - scaleCanvas * 0.25 * y5 + scaleCanvas * (0.45 - canvasHeight) * y3;
	planeGeo.attributes.position.array[5] = z1 + rightLeftOffset - scaleCanvas * 0.25 * z5 + scaleCanvas * (0.45 - canvasHeight) * z3;
	planeGeo.attributes.position.array[9] = x1 - canvasDepth - scaleCanvas * 0.25 * x5 + scaleCanvas * (0.325 - canvasHeight) * x3;
	planeGeo.attributes.position.array[10]= y1 + upDownOffset - scaleCanvas * 0.25 * y5 + scaleCanvas * (0.325 - canvasHeight) * y3;
	planeGeo.attributes.position.array[11]= z1 + rightLeftOffset - scaleCanvas * 0.25 * z5 + scaleCanvas * (0.325 - canvasHeight) * z3;//}
  
	planeGeo.computeBoundingBox(); // for hit area
	canvas.width = 1024;
	canvas.height = 256;
	var ctx = this.ctx = canvas.getContext('2d');
	planeGeo.attributes.position.needsUpdate = true;
	this.plane.material.map.needsUpdate = true;
  }
  update(){
  
	var string = this.string// = str || this.string;
	var ctx = this.ctx;
	var stringlen = this.stringlen;
	var canvas = ctx.canvas;
	ctx.font = this.fontsize + 'px Quicksand';
	
	ctx.font = this.fontsize + 'px Quicksand'
	ctx.textAlign="center"; 
	ctx.textBaseline="middle";
	
	ctx.fillStyle= "#ddeeff"; 
	ctx.fillRect(0, 0, canvas.width, canvas.height );
  
	var maxWidth = canvas.width;
	//var x = (canvas.width - maxWidth) / 2; // left aligned
	var x = canvas.width/2;
	var y = canvas.height/2; // start at the top
  
	ctx.fillStyle = '#5566cc';
	ctx.fillText( string, x, y );
  
	this.plane.material.map.needsUpdate = true;
  }
  clearCol(){
	var string = this.string// = str || this.string;
	var ctx = this.ctx;
	var stringlen = this.stringlen;
	var canvas = ctx.canvas;
	ctx.font = this.fontsize + 'px Quicksand';
	
	ctx.font = this.fontsize + 'px Quicksand'
	ctx.textAlign="center"; 
	ctx.textBaseline="middle";
	ctx.clearRect(0, 0, canvas.width, canvas.height );

	var maxWidth = canvas.width;
	//var x = (canvas.width - maxWidth) / 2; // left aligned
	var x = canvas.width/2;
	var y = canvas.height/2; // start at the top
	let colorstyle =  0.5;
	ctx.fillStyle = '#5566cc';
	ctx.fillText( string, x, y );
  
	this.plane.material.map.needsUpdate = true;
  }
}
