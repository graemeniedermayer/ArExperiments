importScripts('https://cdn.jsdelivr.net/gh/kripken/ammo.js@HEAD/builds/ammo.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');

Ammo().then(function(Ammo) {
  var NUM = 0, NUMRANGE = [];
  shapes = []
  // Bullet-interfacing code

  let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  let overlappingPairCache = new Ammo.btDbvtBroadphase();
  let solver = new Ammo.btSequentialImpulseConstraintSolver();
  let physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
  physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

  var transform = new Ammo.btTransform(); // taking this out of readBulletObject reduces the leaking

  function readBulletObject(i, object) {
    var body = bodies[i];
    body.getMotionState().getWorldTransform(transform);
    var origin = transform.getOrigin();
    object[0] = origin.x();
    object[1] = origin.y();
    object[2] = origin.z();
    var rotation = transform.getRotation();
    object[3] = rotation.x();
    object[4] = rotation.y();
    object[5] = rotation.z();
    object[6] = rotation.w();
  }

  var meanDt = 0, meanDt2 = 0, frame = 1;

  function simulate(dt) {
    dt = dt || 1;

    physicsWorld.stepSimulation(dt, 2);

    var alpha;
    if (meanDt > 0) {
      alpha = Math.min(0.1, dt/1000);
    } else {
      alpha = 0.1; // first run
    }
    meanDt = alpha*dt + (1-alpha)*meanDt;

    var alpha2 = 1/frame++;
    meanDt2 = alpha2*dt + (1-alpha2)*meanDt2;

    let objects =  []

    // Read bullet data into JS objects
    for (var i = 0; i < NUM; i++) {
      let tmpTransform = new Ammo.btTransform();
      shapes[i].getMotionState().getWorldTransform(tmpTransform)
      let pos = tmpTransform.getOrigin()
      let quat = tmpTransform.getRotation()
      objects.push({
        pos:[pos.x(), pos.y(), pos.z()],
        quat:[quat.x(), quat.y(), quat.z(), quat.w()]
      });
    }

    postMessage({type:'update', objects:objects});
  }

  var interval = null;

  onmessage = function(event) {
    if(event.data.type == 'initMap'){
        let {positions, index, matrixWorld, threeVec, width, height, rawConvert, pos, rot} = event.data.map
        groundMesh = new Ammo.btTriangleMesh(true, true)
        // can this be simplifies
        const copy0 = new Ammo.btVector3(0,0,0);
        const copy1 = new Ammo.btVector3(0,0,0);
        const copy2 = new Ammo.btVector3(0,0,0);

        const vert0 = new THREE.Vector3(0,0,0);
        const vert1 = new THREE.Vector3(0,0,0);
        const vert2 = new THREE.Vector3(0,0,0);
        for(let i = 0, l = index.length; i < l; i+=3 ){
          const i0 = index[i] * 3;
          const i1 = index[i+1] * 3;
          const i2 = index[i+2] * 3;

          vert0.fromArray(positions, i0).applyMatrix4(matrixWorld)
          vert1.fromArray(positions, i1).applyMatrix4(matrixWorld)
          vert2.fromArray(positions, i2).applyMatrix4(matrixWorld)

          copy0.setX(vert0.x)
          copy0.setY(vert0.y)
          copy0.setZ(vert0.z)
          copy1.setX(vert1.x)
          copy1.setY(vert1.y)
          copy1.setZ(vert1.z)
          copy2.setX(vert2.x)
          copy2.setY(vert2.y)
          copy2.setZ(vert2.z)

          groundMesh.addTriangle(copy0, copy1, copy2, false)
        }

        groundShape = new Ammo.btBvhTriangleMeshShape(groundMesh, true, true)
        groundShape.setMargin( 0.05 );
        var groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        // Shifts the terrain, since bullet re-centers it on its bounding box.
        groundTransform.setOrigin( new Ammo.btVector3( ...pos ) );
        groundTransform.setRotation(new Ammo.btQuaternion( ...rot ));
        var groundMass = 0;
        var groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
        var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
        let info = new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia )
        var groundBody = new Ammo.btRigidBody( info );
        physicsWorld.addRigidBody( groundBody );

    }else if(event.data.type == 'addSphere'){

      let {pos, vel} = event.data
      size = 0.1
      transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
      transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
      motionState = new Ammo.btDefaultMotionState(transform);
  
      shape = new Ammo.btSphereShape(size);
      shape.setMargin(0.02);
      mass = 0.1
      inertia = new Ammo.btVector3(0, 0, 0);
      if(mass > 0) {
        shape.calculateLocalInertia(mass, inertia);
      }
  
      NUM++
      info = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia);
      body = new Ammo.btRigidBody(info);
      body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z))
      physicsWorld.addRigidBody( body );
      shapes.push(body)
    }else if(event.data.type == 'addCube'){

      let {pos, vel} = event.data
      boxSize = 0.1
      transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
      transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
      motionState = new Ammo.btDefaultMotionState(transform);
  
      size = new Ammo.btVector3(boxSize, boxSize, boxSize);
      shape = new Ammo.btBoxShape(size);
      shape.setMargin(0.02);
  
      mass = 0.1
      inertia = new Ammo.btVector3(0, 0, 0);
      if(mass > 0) {
        shape.calculateLocalInertia(mass, inertia);
      }
      NUM++
      info = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia);
      body = new Ammo.btRigidBody(info);
      body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z))
      physicsWorld.addRigidBody( body );
      shapes.push(body)
    }else if(event.data.type == 'updateMap'){
    }
    // should probably implement a clear map feature.
  }
  transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(0, -4, 0));
  transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
  motionState = new Ammo.btDefaultMotionState(transform);

  size = new Ammo.btVector3(40, 1, 40);
  shape = new Ammo.btBoxShape(size);
  shape.setMargin(0.02);

  mass = 0.0
  inertia = new Ammo.btVector3(0, 0, 0);
  if(mass > 0) {
    shape.calculateLocalInertia(mass, inertia);
  }
  info = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia);
  body = new Ammo.btRigidBody(info);
  physicsWorld.addRigidBody( body );
  var last = Date.now();
  function mainLoop() {
    var now = Date.now();
    simulate(now - last);
    last = now;
  }
  if (interval) clearInterval(interval);
  interval = setInterval(mainLoop, 1000/60);
  postMessage({isReady: true});
});
