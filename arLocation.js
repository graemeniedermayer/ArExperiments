
// okay

sum = arr => arr.reduce( ( a, b ) => a + b, 0 )
average = arr => sum(arr) / arr.length;
maxNode = nodeList => nodeList.reduce((y,x)=>Math.max(Math.max(x[0],x[1]),y),y=-Infinity)
sumMatrix = matrix => matrix.reduce((a,x) => a + sum(x),0)

// normalized
adjMatrix = (nodeList) => {
	let max = maxNode(nodeList)+1;
	var matrix = [];
	for(var i=0; i<max; i++) {
		subMatrix = [];
		for(let j=0; j<max; j++){
			subMatrix.push(0);
		}
	    matrix.push(subMatrix);
	}
	for(let i=0; i<nodeList.length; i++){
		let item = nodeList[i];
		let nodeBig = Math.max(item[0], item[1]);
		let nodeSmall = Math.min(item[0], item[1]);
		matrix[nodeBig][nodeSmall] += 1;
	}
	return matrix;
}

adjMatrixToList = (adjMatrix) => {
	let adjList = [];
	for(let i = 0; i < adjMatrix.length; i++){
		let adjRow = adjMatrix [i]
		for(let j = 0; j < adjRow.length; j++){
			if(i <= j){
				break
			}
			adjList.push(adjRow[j])
		}
	}
	return adjList;
}
// maybe?
adjListToMatrix = (adjList) =>{
	let index = (2*adjList.length+1/4)**0.5+(0.5)
	let adjMatrix = [];
	cumuIndex = 0
	for(let i = 0; i < index; i++){
		let adjRow = []
		for(let j = 0; j < index; j++){
			if(i > j){
				adjRow.push(adjList[cumuIndex])
				cumuIndex +=1
			}else{
				adjRow.push(0)
			}
		}
		adjMatrix.push(adjRow)
	}
	return adjMatrix;
}

nodeList = (adjMatrix) => {
	nodes = [];
	for(var j=0; j<adjMatrix.length; j++){
		for(var k=0; k<adjMatrix.length; k++){
			if(k>j) break;
			if(adjMatrix[j][k]){
				nodes.push([j,k]);
			}
		}
	}	
	return nodes;
}

mkEle = (id = '',classname = [''], innerHTML = '',typeEl = 'div', type = '') => {
	ele = document.createElement(typeEl)
	ele.type = type
	ele.id = id
	for(let i=0; i < classname.length; i++){
		try{
			ele.classList.add(classname[i])
		}catch(e){

		}
	}
	ele.innerHTML = innerHTML
	return ele
}



var scene, camera, renderer, clock, deltaTime, totalTime;

var arToolkitSource, arToolkitContext;

var markerRoot1, markerRoot2;

var mesh1;

deltaTime = 0;
totalTime = 0;



class SiteState{
	constructor(){
		this.mode = 'build';
		this.stateName = ''
		this.queueString = '';
		this.stateString = '';
		this.graphString = '';
	}
	saveState(){
		localStorage.setItem(this.stateName,
			JSON.stringify({
				queue:this.queueString,
				state: this.stateString,
				graph: this.graphString
			})
		)

	}
	getState(){
		let obj = JSON.getItem(this.stateName)
		this.queueString = obj.queue
		this.stateString = obj.state
		this.graphString = obj.graph
		return loc
	}
}
SITESTATE = new SiteState() 
var renderUpdates = []
let quat180y = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
let quat90x = new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI/2, 0, 0, 'XYZ' ))
  	

ClickPoint = (intersect) =>{
	intersectPoint3 = 3 * intersect;
		// Could be turn into a function
	results1 = Priority.contains(intersect);
	let tempTopPriority;
	Priority.bumpPriority(
		results1[0] ? Priority.priority[results1[1]] : Priority.bottomPriority()	
	)
	Priority.priorityFocus();
	tempTopPriority = Priority.topPriority();
}

ClickLine = (intersect) =>{
	intersectPoint3 = 3 * intersect;
		// Could be turn into a function
	results1 = Priority.contains(intersect);
	let tempTopPriority;
	Priority.bumpPriority(
		results1[0] ? Priority.priority[results1[1]] : Priority.bottomPriority()		
	);
	Priority.priorityFocus();
	tempTopPriority = Priority.topPriority()
}

var scene = new THREE.Scene();
markerRoot1 = new THREE.Group();
scene.add(markerRoot1);
var raycaster = new THREE.Raycaster();
var raycharts = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersectObjects = [];
raycaster.linePrecision=0.05;
raycaster.params.Points.threshold = 0.2;

// var intersectChart = [];
// raycharts.linePrecision=0.05;
// raycharts.params.Points.threshold = 0.2;

function raycasterFunction( event) {
	mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	// find out if a point or line are infront
	var intersects = []
	intersects = raycaster.intersectObjects( intersectObjects );
	if (intersects.length > 0){
		intersects = intersects.filter(x => {
			let allowPoints = x.object.type == 'LineSegments' || x.index < x.object.geometry.drawRange.count;
			let allowLine = x.object.type == 'Points' || x.index < x.object.geometry.drawRange.count;
			let allowMesh = x.object.type == 'Mesh' ;
			return (allowPoints && allowLine) || allowMesh;
		})
		return [intersects[ 0 ], raycaster.ray]
	}else{
		return [undefined, raycaster.ray]
	}
}

// Floating graph's that follow you
getCanvas = () =>{
	let canvas = document.createElement('canvas');
  	canvas.width = 512;
	canvas.height= 512;
	let el = document.createElement('div');
	// el.style.position
	el.style.position= 'relative';
	el.style.bottom='-1024px';
	el.style.height= '512px' 
	el.style.width='512px'
	el.appendChild(canvas)
	document.body.appendChild(el)
  	let ctx = canvas.getContext('2d');
	ctx.fillStyle=  "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height );
	return canvas
}

function clickCanvas(thisCanvas, point) {
	rect = thisCanvas.getBoundingClientRect();
	let x =  (thisCanvas.width*(1-point.x/2));
	let y = rect.top - thisCanvas.height*(point.y)/2;
	evt = new MouseEvent('touchmove', {
		clientX: x,
		clientY: y
	}),
	thisCanvas.dispatchEvent(evt);
}

makeGraph = () => {
	canvas = getCanvas()
	
	canvas.width = 512;
	canvas.height= 512;
	canvas.parentNode.style.height ='512px';
	canvas.parentNode.style.width = '512px';
	let ctx = canvas.getContext('2d');
	let myChart = new Chart(ctx, {
    	type: 'bar',
    	data: {
			labels: [0],
    	    datasets: [{
    	        label:'o',
    	        data: [0,2,12,13,2],
    	        backgroundColor: [
                'rgba(255, 99, 132, 0.2)'
    	        ],
    	        borderColor: [
                'rgba(255, 99, 132, 0.4)'
    	        ],
    	        barPercentage: 1,
    	        borderWidth: 1
    	    }]
    	},
    	options: {
		responsive: false,
		devicePixelRatio: 1,
    	maintainAspectRatio: true,
    	    legend:{
    	        display:false
    	    },
			offset:false,
			title: {
				display: true,
				text: 'Degree Distributions',
				fontFamily: 'Quicksand',
				fontSize: 35
			},
	        scales: {
				display: true,
	            yAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: `Number of people`,
						fontFamily: 'Quicksand',
						fontSize: 30
					},
	                ticks: {
	                    beginAtZero: true
	                }
				}],
				xAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: `number of relations`,
						fontFamily: 'Quicksand',
						fontSize: 30
					},
					barPercentage: 1.0,
					categoryPercentage: 1.0
	            }]
	        }
	    }
	});
	return [myChart, canvas]	
}

const interactions = interact('.resize-drag')
  .draggable({
	ignoreFrom: '.ignore',
    restrict: {
      restriction: '#wrapper',
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
	onmove: dragMoveListener,
	onend: endMoveListener,
    inertia: true,
  })
  .resizable({
    // resize from all edges and corners
    edges: { left: '.resize-left', right: '.resize-right', bottom: '.resize-bottom', top: '.resize-top' },

    // keep the edges inside the parent
    restrictEdges: {
      outer: '#wrapper',
      endOnly: true,
    },

    // minimum size
    restrictSize: {
      min: { width: 200, height: 95 },
    },
	onend: endMoveListener,
    inertia: true,
  })
  .on('resizemove', function (event) {
    var target = event.target,
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0);

    // update the element's style
    target.style.width  = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';

    // translate when resizing from top or left edges
	x += event.deltaRect.left;
	if(target.offsetHeight>=95){
		y += event.deltaRect.top;
	}
    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)';

    target.setAttribute('data-x', x);
	target.setAttribute('data-y', y);
	
  })

const drag = {name: 'drag'}
interactions.reflow(drag)
// connection Strings to functions

// Queue = new queue()

function dragMoveListener (event) {
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)';

    // update the position attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }
function endMoveListener(event){
	// saveLocation
	var target = event.target
	let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
	y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
	
}


class ThreeGraph{
	constructor(vertices, edges, points=[], color = [0.350, 0.474, 0.854], interactable, absPosition){
		// list of features
		this.edges = edges // Edges positions
		this.vertices = vertices // This vertices by 
		this.maxPoint = vertices.length
		this.points = points;
		this.color = color;
		this.absPosition = absPosition;
		this.interact = interactable
	}
	vertexEnds(intersect){
		let endPoints = this.vertices[intersect]
		return [this.edges[endPoints], this.edges[endPoints]]
	}
	edgeToVertices(intersect){
		return this.vertices.reduce(x => x.includes(intersect))
	}
	saveGraph(){
		SITESTATE.graphString = JSON.stringify({
			edges: this.edges,
			maxPoint : this.maxPoint,
			vertices: this.vertices,
			points: this.points,
		})
	}
	loadGraph(){
		let obj = JSON.parse( SITESTATE.graphString )
		this.edges = obj.edges 
		this.maxPoint = obj.maxPoint
		this.vertices = obj.vertices
		this.points = obj.points
	}
	clearGraph(){
		this.edges = []
		this.maxPoint = []
		this.vertices = []
		this.points = []
	}
	buildGraph(){
		let particles = 200
		this.positions = new Float32Array( particles * 3 );
		this.colors = new Float32Array( particles * 3 );
		this.sizes = new Float32Array( particles * 3  );
		let geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.BufferAttribute( this.positions, 3 ) );
		geometry.setAttribute( 'customColor', new THREE.BufferAttribute( this.colors, 3 ) );
		geometry.setAttribute( 'size', new THREE.BufferAttribute( this.sizes, 1 ) );
		this.lineSystem = new THREE.LineSegments( geometry, shaderMaterial1 );
		markerRoot1.add(this.lineSystem)

		let lines = 200
		this.positionsPart = new Float32Array( lines * 3 );
		this.colorsPart = new Float32Array( lines * 3 );
		this.sizesPart = new Float32Array( lines * 3 );
		let geometryPart = new THREE.BufferGeometry();
		geometryPart.setAttribute( 'position', new THREE.BufferAttribute( this.positionsPart, 3 ) );
		geometryPart.setAttribute( 'customColor', new THREE.BufferAttribute( this.colorsPart, 3 ) );
		geometryPart.setAttribute( 'size', new THREE.BufferAttribute( this.sizesPart, 1 ) );
		this.pointSystem = new THREE.ParticleSystem( geometryPart, shaderMaterial );
		markerRoot1.add(this.pointSystem)

		for(let i=0; i<this.edges.length; i++){
			let mid1 = (this.points[this.edges[i][0]][0] + this.points[this.edges[i][1]][0])/2
			let mid2 = (this.points[this.edges[i][0]][1] + this.points[this.edges[i][1]][1])/2
			let mid3 = (this.points[this.edges[i][0]][2] + this.points[this.edges[i][1]][2])/2
			let av1 = (this.points[this.edges[i][0]][0] - this.points[this.edges[i][1]][0])/2
			let av2 = (this.points[this.edges[i][0]][1] - this.points[this.edges[i][1]][1])/2
			let av3 = (this.points[this.edges[i][0]][2] - this.points[this.edges[i][1]][2])/2
			this.positions[ 6*i + 0 ] = mid1 + 0.85 * av1
			this.positions[ 6*i + 1 ] = mid2 + 0.85 * av2
			this.positions[ 6*i + 2 ] = mid3 + 0.85 * av3
			this.positions[ 6*i + 3 ] = mid1 - 0.85 * av1
			this.positions[ 6*i + 4 ] = mid2 - 0.85 * av2
			this.positions[ 6*i + 5 ] = mid3 - 0.85 * av3
			this.colors[ 6*i + 0 ] = this.color[0]
			this.colors[ 6*i + 1 ] = this.color[1]
			this.colors[ 6*i + 2 ] = this.color[2]
			this.colors[ 6*i + 3 ] = this.color[0]
			this.colors[ 6*i + 4 ] = this.color[1]
			this.colors[ 6*i + 5 ] = this.color[2]
			this.sizes[ 6*i + 0 ] = 10
			this.sizes[ 6*i + 1 ] = 10
			this.sizes[ 6*i + 2 ] = 10
			this.sizes[ 6*i + 3 ] = 10
			this.sizes[ 6*i + 4 ] = 10
			this.sizes[ 6*i + 5 ] = 10
		}
		for(let i=0; i<this.points.length; i++){
			this.positionsPart[ 3*i + 0 ] = this.points[i][0]
			this.positionsPart[ 3*i + 1 ] = this.points[i][1]
			this.positionsPart[ 3*i + 2 ] = this.points[i][2]
			this.colorsPart[ 3*i + 0 ] = this.color[0]
			this.colorsPart[ 3*i + 1 ] = this.color[1]
			this.colorsPart[ 3*i + 2 ] = this.color[2]
			this.sizesPart[ 3*i + 0 ] = .2
			this.sizesPart[ 3*i + 1 ] = .2
			this.sizesPart[ 3*i + 2 ] = .2
		}
		this.lineSystem.geometry.setDrawRange(0, 2* this.edges.length)
		this.pointSystem.geometry.setDrawRange(0, this.points.length)	
		this.lineSystem.position.set(...this.absPosition)
		this.pointSystem.position.set(...this.absPosition)
		geometry.attributes.customColor.needsUpdate = true;
		geometry.attributes.position.needsUpdate = true;
		geometry.attributes.size.needsUpdate = true;
		geometryPart.attributes.customColor.needsUpdate = true;
		geometryPart.attributes.position.needsUpdate = true;
		geometryPart.attributes.size.needsUpdate = true;
		if(this.interact){
			intersectObjects.push(this.lineSystem)
			intersectObjects.push(this.pointSystem)
		}
	}
	refresh(){
		while(this.points.length < this.edges.length ){
			this.points.push([Math.random(), Math.random(), Math.random()])
		}
		for(let i=0; i<this.edges.length; i++){
			let mid1 = (this.points[this.edges[i][0]][0] + this.points[this.edges[i][1]][0])/2
			let mid2 = (this.points[this.edges[i][0]][1] + this.points[this.edges[i][1]][1])/2
			let mid3 = (this.points[this.edges[i][0]][2] + this.points[this.edges[i][1]][2])/2
			let av1 = (this.points[this.edges[i][0]][0] - this.points[this.edges[i][1]][0])/2
			let av2 = (this.points[this.edges[i][0]][1] - this.points[this.edges[i][1]][1])/2
			let av3 = (this.points[this.edges[i][0]][2] - this.points[this.edges[i][1]][2])/2
			this.positions[ 6*i + 0 ] = mid1 + 0.85 * av1
			this.positions[ 6*i + 1 ] = mid2 + 0.85 * av2
			this.positions[ 6*i + 2 ] = mid3 + 0.85 * av3
			this.positions[ 6*i + 3 ] = mid1 - 0.85 * av1
			this.positions[ 6*i + 4 ] = mid2 - 0.85 * av2
			this.positions[ 6*i + 5 ] = mid3 - 0.85 * av3
			this.colors[ 6*i + 0 ] = this.color[0]
			this.colors[ 6*i + 1 ] = this.color[1]
			this.colors[ 6*i + 2 ] = this.color[2]
			this.colors[ 6*i + 3 ] = this.color[0]
			this.colors[ 6*i + 4 ] = this.color[1]
			this.colors[ 6*i + 5 ] = this.color[2]
			this.sizes[ 6*i + 0 ] = 10
			this.sizes[ 6*i + 1 ] = 10
			this.sizes[ 6*i + 2 ] = 10
			this.sizes[ 6*i + 3 ] = 10
			this.sizes[ 6*i + 4 ] = 10
			this.sizes[ 6*i + 5 ] = 10
		}
		for(let i=0; i<this.points.length; i++){
			this.positionsPart[ 3*i + 0 ] = this.points[i][0]
			this.positionsPart[ 3*i + 1 ] = this.points[i][1]
			this.positionsPart[ 3*i + 2 ] = this.points[i][2]
			this.colorsPart[ 3*i + 0 ] = this.color[0]
			this.colorsPart[ 3*i + 1 ] = this.color[1]
			this.colorsPart[ 3*i + 2 ] = this.color[2]
			this.sizesPart[ 3*i + 0 ] = .2
			this.sizesPart[ 3*i + 1 ] = .2
			this.sizesPart[ 3*i + 2 ] = .2
		}
		this.lineSystem.geometry.setDrawRange(0, 2* this.edges.length)
		this.pointSystem.geometry.setDrawRange(0, this.vertices.length)	
		this.lineSystem.position.set(...this.absPosition)
		this.pointSystem.position.set(...this.absPosition)
		this.lineSystem.geometry.attributes.customColor.needsUpdate = true;
		this.lineSystem.geometry.attributes.position.needsUpdate = true;
		this.lineSystem.geometry.attributes.size.needsUpdate = true;
		this.pointSystem.geometry.attributes.customColor.needsUpdate = true;
		this.pointSystem.geometry.attributes.position.needsUpdate = true;
		this.pointSystem.geometry.attributes.size.needsUpdate = true;
		if(this.interact){
			intersectObjects.push(this.lineSystem)
			intersectObjects.push(this.pointSystem)
		}
	}
	addPoint(intersect, point= undefined){
		let rand1 = Math.random()	
		let rand2 = Math.random()	
		let rand3 = Math.random()
		this.points.push(point||[rand1, rand2, rand3])
		this.maxPoint += 1
		this.vertices.push(this.maxPoint)
		// remove associated lines

		this.positionsPart[ 3*intersect + 0 ] = rand1 //this.points[i][0]
		this.positionsPart[ 3*intersect + 1 ] = rand2 //this.points[i][1]
		this.positionsPart[ 3*intersect + 2 ] = rand3 //this.points[i][2]
		this.colorsPart[ 3*intersect + 0 ] = this.color[0]
		this.colorsPart[ 3*intersect + 1 ] = this.color[1]
		this.colorsPart[ 3*intersect + 2 ] = this.color[2]
		this.sizesPart[ 3*intersect + 0 ] = .2
		this.sizesPart[ 3*intersect + 1 ] = .2
		this.sizesPart[ 3*intersect + 2 ] = .2
		this.pointSystem.geometry.setDrawRange(0,  ( this.vertices.length) )
		this.pointSystem.geometry.attributes.customColor.needsUpdate = true;
		this.pointSystem.geometry.attributes.position.needsUpdate = true;
		this.pointSystem.geometry.attributes.size.needsUpdate = true;
	}
	removePoint(intersect){
		let attributes = this.pointSystem.geometry.attributes
		// does this work?
		let a = attributes.customColor.array.subarray( 3 * intersect, 3 * this.vertices.length );
		a.set(attributes.customColor.array.subarray( 3 * (intersect-1), 3 * (this.vertices.length-1) ));
		
		let b = attributes.position.array.subarray( 3 * intersect, 3 * this.vertices.length );
		b.set(attributes.position.array.subarray( 3 * (intersect-1), 3 * (this.vertices.length-1) ));
		
		let c = attributes.size.array.subarray( intersect, this.vertices.length );
		c.set(attributes.size.array.subarray( (intersect-1), (this.vertices.length-1) ));
		
		this.points.splice(this.points.length - 1)
		this.vertices.splice(this.vertices.length - 1)
		// move everything back?
		// this.vertices.splice(intersect-1)
		this.pointSystem.geometry.setDrawRange(0, this.vertices.length )
		this.pointSystem.geometry.attributes.customColor.needsUpdate = true;
		this.pointSystem.geometry.attributes.position.needsUpdate = true;
		this.pointSystem.geometry.attributes.size.needsUpdate = true;
	}
	addLine([startPoint, endPoint]){
		for(let i =0; i < this.edges.length;i++){
			if(this.edges[i].includes(startPoint) && this.edges[i].includes(endPoint)){
				return
			}
		}
		let oldPoints = this.edges.length
		this.edges.push([startPoint, endPoint])
		let mid1 = (this.points[startPoint][0] + this.points[endPoint][0])/2;
		let mid2 = (this.points[startPoint][1] + this.points[endPoint][1])/2;
		let mid3 = (this.points[startPoint][2] + this.points[endPoint][2])/2;
		let av1 =  (this.points[endPoint][0] - this.points[startPoint][0])/2;
		let av2 =  (this.points[endPoint][1] - this.points[startPoint][1])/2;
		let av3 =  (this.points[endPoint][2] - this.points[startPoint][2])/2;
		this.positions[ 6*oldPoints + 0 ] = mid1 + 0.9 * av1
		this.positions[ 6*oldPoints + 1 ] = mid2 + 0.9 * av2
		this.positions[ 6*oldPoints + 2 ] = mid3 + 0.9 * av3
		this.positions[ 6*oldPoints + 3 ] = mid1 - 0.9 * av1
		this.positions[ 6*oldPoints + 4 ] = mid2 - 0.9 * av2
		this.positions[ 6*oldPoints + 5 ] = mid3 - 0.9 * av3
		this.colors[ 6*oldPoints + 0 ] = this.color[0]
		this.colors[ 6*oldPoints + 1 ] = this.color[1]
		this.colors[ 6*oldPoints + 2 ] = this.color[2]
		this.colors[ 6*oldPoints + 3 ] = this.color[0]
		this.colors[ 6*oldPoints + 4 ] = this.color[1]
		this.colors[ 6*oldPoints + 5 ] = this.color[2]
		this.sizes[ 6*oldPoints + 0 ] = 10
		this.sizes[ 6*oldPoints + 1 ] = 10
		this.sizes[ 6*oldPoints + 2 ] = 10
		this.sizes[ 6*oldPoints + 3 ] = 10
		this.sizes[ 6*oldPoints + 4 ] = 10
		this.sizes[ 6*oldPoints + 5 ] = 10
		this.lineSystem.geometry.setDrawRange(0, 2* this.edges.length )
		this.lineSystem.geometry.attributes.customColor.needsUpdate = true;
		this.lineSystem.geometry.attributes.position.needsUpdate = true;
		this.lineSystem.geometry.attributes.size.needsUpdate = true;
	
	}
	removeLine([startPoint, endPoint]){
		let intersect
		for(let i =0; i< this.edges.length;i++){
			if(this.edges[i].includes(startPoint) && this.edges[i].includes(endPoint)){
				intersect = i;
				break;
			}
		}
		let attributes = this.lineSystem.geometry.attributes
		let length = this.edges.length
		// does this work?
		let a = attributes.customColor.array.subarray( 6 * intersect, 6 * length )
		a.set(attributes.customColor.array.subarray( 6 * (intersect- 1), 6 * (length-1) ))
		
		let b = attributes.position.array.subarray( 6 * intersect, 6 * length ) 
		b.set(attributes.position.array.subarray( 6 * (intersect-1), 6 * (length-1) ))
		
		let c = attributes.size.array.subarray( 3 * intersect, 3 * length )
		c.set(attributes.size.array.subarray( 3 * (intersect-1), 3 * (length-1) ))
		this.edges.splice(this.edges.length-1)
		this.lineSystem.geometry.setDrawRange(0, 2 * this.edges.length)
		this.lineSystem.geometry.attributes.customColor.needsUpdate = true;
		this.lineSystem.geometry.attributes.position.needsUpdate = true;
		this.lineSystem.geometry.attributes.size.needsUpdate = true;
	}
	movePoint(index, newPosition){
		this.positionsPart[ 3*index + 0 ] = newPosition[0]
		this.positionsPart[ 3*index + 1 ] = newPosition[1]
		this.positionsPart[ 3*index + 2 ] = newPosition[2]
		this.pointSystem.geometry.setDrawRange(0,  ( this.points.length) )
		this.pointSystem.geometry.attributes.position.needsUpdate = true;
	}
	moveLine(lineIndex){
		[startPoint, endPoint]=this.edges[lineIndex]
		let mid1 = (this.points[startPoint][0] + this.points[endPoint][0])/2;
		let mid2 = (this.points[startPoint][1] + this.points[endPoint][1])/2;
		let mid3 = (this.points[startPoint][2] + this.points[endPoint][2])/2;
		let av1 =  (this.points[endPoint][0] - this.points[startPoint][0])/2;
		let av2 =  (this.points[endPoint][1] - this.points[startPoint][1])/2;
		let av3 =  (this.points[endPoint][2] - this.points[startPoint][2])/2;
		this.positions[ 6*lineIndex + 0 ] = mid1 + 0.9 * av1
		this.positions[ 6*lineIndex + 1 ] = mid2 + 0.9 * av2
		this.positions[ 6*lineIndex + 2 ] = mid3 + 0.9 * av3
		this.positions[ 6*lineIndex + 3 ] = mid1 - 0.9 * av1
		this.positions[ 6*lineIndex + 4 ] = mid2 - 0.9 * av2
		this.positions[ 6*lineIndex + 5 ] = mid3 - 0.9 * av3
		this.pointSystem.geometry.attributes.position.needsUpdate = true;
	
	}
	computeDegrees(intersect = undefined){
		degrees = []
		if(Integer.isNumber(intersect)){
			// perspective distribution

		}else{
			// complete degree distribution

		}
		return degrees
	}

}

class Priority{
	constructor(priority){
		this.priority = [null,null,null,null];
		this.prioritylen = 0;
		this.priority = priorityList;
		this.prioritylen = this.priority.length-1;
		this.maxZ = 30;
	}
	bumpPriority(wind){
		// This is dumb
		this.priority = this.priority.sort((x,y) => x == wind ? -1 : y == wind ? 1 : 0);
		for(var i = 0; i <= this.prioritylen; i++){
			this.priority[i].section.style.zIndex = this.maxZ-i;
		}
	}
	reverseOne(){
		let lastwind = this.priority[0];
		this.priority = this.priority.sort( (x,y)=> x == lastwind ? 1 : y == lastwind ? -1 : 0);
		for(var i = 0; i <= this.prioritylen; i++){
			this.priority[i].section.style.zIndex = this.maxZ-i;
		}
	}
	getWindBySec(sec){
		for(var i = 0; i <= this.prioritylen; i++){
			if(this.priority[i].section==sec){
				return this.priority[i]; 
			}
		}	
	}
	topPriority(){
		return this.priority[0];
	}
	bottomPriority(){
		return this.priority[this.prioritylen];
	}
	priorityFocus(){
		setTimeout(function(){
			try{	
				document.getElementById(Priority.topPriority().box3.id).children[0].focus();
			}catch(e){
				document.activeElement.blur();
			}
		},20)

	}
	hidePriority(wind){
		this.priority = this.priority.sort((x,y)=> x == wind ? 1 : y == wind ? -1 : 0);
		wind.hide();
		// BADDD
		for(var i = 0; i <= this.prioritylen; i++){
			this.priority[i].section.style.zIndex = this.maxZ-i;
		}
	}
}


// click point
var baseColor = new THREE.Color(0xffffff );
var texture = new THREE.TextureLoader().load( '/static/eave/data/circle5.png' );
// Sprites
var uniforms = {
	color:     { value: baseColor },
	texture:   { value: texture }
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
var uniforms1 = {
	color:     { value: baseColor }
};
var shaderMaterial1 = new THREE.ShaderMaterial( {
	uniforms:       uniforms1,
	vertexShader:  document.getElementById( 'vertexshader' ).textContent,
	fragmentShader: document.getElementById( 'fragmentshader1' ).textContent,
	depthTest:   true,
	transparent:   true,
	opacity: 0.5,
	depthWrite: true,
});

var particles = 40
var touchpositions = new Float32Array( particles * 3 );
var touchcolors = new Float32Array( particles * 3 );
var touchsizes = new Float32Array( particles );
var touchGeometry = new THREE.BufferGeometry();
touchGeometry.setAttribute( 'position', new THREE.BufferAttribute( touchpositions, 3 ) );
touchGeometry.setAttribute( 'customColor', new THREE.BufferAttribute( touchcolors, 3 ) );
touchGeometry.setAttribute( 'size', new THREE.BufferAttribute( touchsizes, 1 ) );
touchGeometry.attributes.customColor.needsUpdate = true;
touchGeometry.attributes.position.needsUpdate = true;
touchGeometry.attributes.size.needsUpdate = true;
touchSystem = new THREE.LineSegments( touchGeometry, shaderMaterial1 );
touchSystem.position.set(0,0,1.5)
markerRoot1.add(touchSystem)

var parts = []
var users = []
var struct = []
var struct1 = []
var parts1 = []
var users1 = []
for(let i = 0; i<20; i++){
	users.push(i)
	parts.push([Math.random(), Math.random(), Math.random()])
	users1.push(i)
	parts1.push([Math.random(), Math.random(), Math.random()])
}
while(struct.length < 30){
	let isContinue = false
	let ver1 = ~~(Math.random()*20)
	let ver2 = ~~(Math.random()*20)
	for(let i =0; i< struct.length; i++){
		if(struct[i].includes(ver1) && struct[i].includes(ver2)){
			isContinue = true;
		}
	}
	if(isContinue|| ver1==ver2) continue
	struct.push([ver1,ver2])
	struct1.push([ver1,ver2])
}

//TODO does this need to be two objects?
graph = new ThreeGraph(users, struct, parts, [0.350, 0.474, 0.854], true, [0, 0,  1.5])
graph.buildGraph()

optGraph = new ThreeGraph(users1, struct1, parts1, [0.350, 0.874, 0.454], false, [0, 0 , -1.5])
optGraph.buildGraph()


actionList = {
	'addLine':  [graph.addLine,  graph.removeLine],
	'addPoint': [graph.addPoint, graph.removePoint],
	'movePoint':[graph.movePoint,graph.movePoint],
	'moveLine': [graph.moveLine, graph.moveLine],
	
}
class queue{
	constructor(){
		this.headOfQueue = 0
		this.maxQueueSize = 100
		// must be strings
		this.actionSet = []
	}
	saveState(){
		// update queue state
		queueState = JSON.stringify({
			actions: this.actionSet,
			head: this.headOfQueue
		})
	}
	clearQueue(){
		this.actionSet = []
		this.saveState()
	}
	addAction(actionType, actionParameters){
		this.actionSet.push([actionType, actionParameters])
		// TODO Save to location storage
		if(this.actionSet.length > this.maxQueueSize){
			this.actionSet.splice(0,1)
		}
	}
	undo(){
		if(this.headOfQueue > 0){
			this.headOfQueue -= 1
			let parms = this.actionSet[this.headOfQueue][1]
			actionList[ this.actionSet[this.headOfQueue][0] ][1].bind(graph,parms).apply()
			
		}else{
			// undo failed
			// Grey undo button
		}
	}
	redo(){
		if(this.headOfQueue != this.actionSet.length){
			let parms = this.actionSet[this.headOfQueue][1]
			actionList[ this.actionSet[this.headOfQueue][0] ][0].bind(graph,parms).apply()
			this.headOfQueue += 1
		}else{
			
			// redo failed
			// grey undo button
		}

	}
	checkAvail(){
		if(this.headOfQueue > 0){
			document.getElementById('undo').style.color = 'blue'
		}else{
			document.getElementById('undo').style.color = 'lightgrey'
		}
		if(this.headOfQueue != this.actionSet.length){
			document.getElementById('redo').style.color = 'blue'
		}else{
			document.getElementById('redo').style.color = 'lightgrey'
		}
		yAxis = degreeDistribution(adjMatrix(graph.edges))
		currentDistribution.data.labels = yAxis.map((_,i)=>i)
		currentDistribution.data.datasets[0].data = yAxis
		currentDistribution.update();
		yAxis = degreeDistribution(adjMatrix(optGraph.edges))
		idealDistribution.data.labels = yAxis.map((_,i)=>i)
		idealDistribution.data.datasets[0].data = yAxis
		idealDistribution.update();
	}
	do(actionType,actionParameters){
		this.actionSet.splice(this.headOfQueue)
		this.addAction(actionType,actionParameters)
		this.redo()
		this.checkAvail()
	}
	completeAction(){
		this.headOfQueue += 1
	}
}

Queue = new queue()
var container = document.getElementById('backcanvas')
var Width = container.offsetWidth;
var Height = container.offsetHeight;
var camera = new THREE.PerspectiveCamera( 30, Width/Height, 0.1, 20000 );
camera.position.z = 1;
camera.position.y = 1;
camera.position.x = 1;
var renderer = new THREE.WebGLRenderer({antialias: true,alpha:true });
renderer.setPixelRatio( window.devicePixelRatio );
camera.aspect = Width /Height;
renderer.setSize( Width, Height );
camera.updateProjectionMatrix();
container.appendChild( renderer.domElement );	

arToolkitSource = new THREEx.ArToolkitSource({
	sourceType : 'webcam',
	displayWidth: Width,
	displayHeight: Height,
});

function onResize()
{
	arToolkitSource.onResize()	
	arToolkitSource.copySizeTo(renderer.domElement)	
	if ( arToolkitContext.arController !== null )
	{
		arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)	
	}	
}
arToolkitSource.init(function onReady(){
	onResize()
});
window.addEventListener('resize', function(){
	onResize()
});
arToolkitContext = new THREEx.ArToolkitContext({
	cameraParametersUrl: '/static/eave/experiment/camera_para.dat',
	detectionMode: 'color_and_matrix',
	maxDetectionRate: 60,
	imageSmoothingEnabled : true,
});	
// copy projection matrix to camera when initialization complete
arToolkitContext.init( function onCompleted(){
	camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
	onResize()
});
////////////////////////////////////////////////////////////
// setup markerRoots
////////////////////////////////////////////////////////////
// build markerControls
let markerControls1 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
	type: 'pattern', patternUrl: "/static/eave/experiment/hiro.patt",
	changeMatrixMode : 'modelViewMatrix',
	// turn on/off camera smoothing
	smooth: true,
	// number of matrices to smooth tracking over, more = smoother but slower follow
	smoothCount: 5,
	// distance tolerance for smoothing, if smoothThreshold # of matrices are under tolerance, tracking will stay still
	smoothTolerance: 0.03,
	// threshold for smoothing, will keep still unless enough matrices are over tolerance
	smoothThreshold: 2,
})	
// Locations
var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true
controls.dampingFactor=0.05
controls.rotateSpeed=0.2
controls.maxDistance = 20;
controls.enablePan = false;

var addPlanarGraph = (canvas, pos, absPosition, size = 1) =>{
	let planeGeo =  new THREE.PlaneBufferGeometry( 4, 6.4 );
	planeGeo.attributes.position.array[0] = -size + pos.x;
	planeGeo.attributes.position.array[1] = -size + pos.y;
	planeGeo.attributes.position.array[2] = -size + pos.z;
	planeGeo.attributes.position.array[6] = -size + pos.x;
	planeGeo.attributes.position.array[7] = -size + pos.y;
	planeGeo.attributes.position.array[8] =  size + pos.z;
	planeGeo.attributes.position.array[3] = -size + pos.x;
	planeGeo.attributes.position.array[4] =  size + pos.y;
	planeGeo.attributes.position.array[5] = -size + pos.z;
	planeGeo.attributes.position.array[9] = -size + pos.x;
	planeGeo.attributes.position.array[10]=  size + pos.y;
	planeGeo.attributes.position.array[11]=  size + pos.z;
	planeGeo.rotateX(Math.PI/2)
	planeGeo.lookAt(new THREE.Vector3(-10, 0, 0))
	planeGeo.computeBoundingBox();
	let quat180y = new THREE.Quaternion().setFromEuler(new THREE.Euler( 0, Math.PI, 0, 'XYZ' ))
	let texture = new THREE.Texture( canvas ) ;
	let planeMat = new THREE.MeshBasicMaterial({
	  map: texture,
	  blending : THREE.NormalBlending,
	  depthTest:   true,
	  transparent:   true,
	  depthWrite: true
	});
	plane = new THREE.Mesh( planeGeo, planeMat );
	plane.position.set(...absPosition)
	planeGeo.attributes.position.needsUpdate = true;
	plane.userData = {'pos':pos, 'size':1}
	plane.material.map.needsUpdate = true;
	return plane
}
let labels = []
let data = []
let greenColor = []
let blueColor = [0,1,0]
let currentDistribution, currentCanvas;
let idealDistribution, idealCanvas;
[currentDistribution, currentCanvas] = makeGraph();
[idealDistribution, idealCanvas] = makeGraph();

scrollTo(0,0)
// // Bins
planes = []
updateFunc = (plane,step)=>{
	var targetQuaternion = camera.quaternion.clone().multiply(markerRoot1.quaternion.clone().inverse() ).multiply( quat180y)
	if ( !plane.quaternion.equals( targetQuaternion ) ) {
		plane.quaternion.slerp( targetQuaternion, 4*step );
	}
}
planes.push(addPlanarGraph(currentCanvas, new THREE.Vector3(2,-0.8,0.7), [0, 0, 1.5]))
planes.push(addPlanarGraph(idealCanvas, new THREE.Vector3(2,-0.8,0.7), [0, 0, -1.5]))
renderUpdates.push((e)=>updateFunc(planes[0],e))
renderUpdates.push((e)=>updateFunc(planes[1],e))
markerRoot1.add(planes[0])
markerRoot1.add(planes[1])
intersectObjects.push(planes[0])
intersectObjects.push(planes[1])
var light = new THREE.AmbientLight( 0x404040, 7 ); // soft white light
markerRoot1.add( light );
var light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 1, -1, 1 ).normalize();
markerRoot1.add( light );
var clock = new THREE.Clock();

function worldToLocal( givenObject, worldVec){
    localVec = new THREE.Vector3()
    givenObject.updateMatrixWorld(); 
	localVec.copy( worldVec )
	.sub(givenObject.position)
	.applyQuaternion( givenObject.quaternion.clone().inverse() )
	.sub(new THREE.Vector3(-.2,.3,1))
	return {x:localVec.x, y:localVec.y};
} 
		
var render = function () {
	controls.update();
	if ( arToolkitSource.ready !== false )arToolkitContext.update( arToolkitSource.domElement );
	requestAnimationFrame( render );
	touchSystem.geometry.attributes.position.needsUpdate = true
	planes[0].material.map.needsUpdate = true;
	planes[1].material.map.needsUpdate = true;
	renderer.render(scene, camera);		
	var delta = clock.getDelta();
	totalTime += deltaTime;
	var step = 0.5 * delta < 1 ? 0.5 * delta : 1;
	for(let i = 0; i<renderUpdates.length; i++){
		renderUpdates[i](step)
	}
};
TOUCHSTATE = {}

function infoTags(){
	let infos = document.getElementsByClassName('infotag')
	for(let infoNum = 0; infoNum < infos.length; infoNum++){
		let info = infos[infoNum]
		info.addEventListener('mousedown', function(ev){
			ev.preventDefault()
			if(this.getAttribute('value') == 'true'){
				this.setAttribute('value', 'false')
				this.parentElement.getElementsByClassName("infotext")[0].style.display = 'block'
			}else{
				this.setAttribute('value', 'true')
				this.parentElement.getElementsByClassName("infotext")[0].style.display = 'none'
			}
		})
		info.addEventListener('touchstart', function(ev){
			ev.preventDefault()
			if(this.getAttribute('value') == 'true'){
				this.setAttribute('value', 'false')
				this.parentElement.getElementsByClassName("infotext")[0].style.display = 'block'
			}else{
				this.setAttribute('value', 'true')
				this.parentElement.getElementsByClassName("infotext")[0].style.display = 'none'
			}
		})
	}
}
infoTags()

render();
intendDistribution = (func) => {
	let yAxis = []
	let xAxis = []
	for(let i=0; i<numberOfBins; i++){
		// This is numerically very lazy (implement simpson's rule?)
		// URG nope.
		yAxis.push( func(binWidth*(i+1/2)) )
		xAxis.push( binWidth*(i+1/2) )
	}
	return [xAxis, yAxis]
}
degreeDistribution = (adjMatrix) => {
	let degreeDistribution = []
	for(let i=0; i<15;i++){degreeDistribution.push(0)}
	for(let i=0; i<adjMatrix.length; i++){
		let count = 0
		for(let j=0; j<adjMatrix.length; j++){
			// if(i < j) break
			if(adjMatrix[j][i] == 1 || adjMatrix[i][j] == 1)count+=1
		}
		if(count<10){
			degreeDistribution[count]+=1
		}
	}
	return degreeDistribution
}

// // Compasion is 2*(a-b)/(a+b)? maybe
compareDistribution = (distro1, distro2) => distro1.map((x,i) => 2*x-distro2[i]/(x+distro2[i]) )
sumDist = (y) => y.reduce( (x,i) => x + i, 0) 
let calculatedExit = 20
let calculatedDistribution = []
// Working loop O(n^2) algo?


differentialApproach = () => {

}

setTimeout(()=>{
yAxis = degreeDistribution(adjMatrix(graph.edges))
currentDistribution.data.labels = yAxis.map((_,i)=>i)
currentDistribution.data.datasets[0].backgroundColor = yAxis.map((_,i)=>'rgba(132, 99, 255, 0.6)')
currentDistribution.data.datasets[0].data = yAxis
currentDistribution.update();
yAxis = degreeDistribution(adjMatrix(optGraph.edges))

idealDistribution.data.labels = yAxis.map((_,i)=>i)
idealDistribution.data.datasets[0].backgroundColor = yAxis.map((_,i)=>'rgba(99, 255, 132, 0.6)')
idealDistribution.data.datasets[0].data = yAxis
idealDistribution.update();
},500)
