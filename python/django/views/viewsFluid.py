
from django.http import HttpResponse
import json
import numpy as np,scipy.sparse.linalg as sciSolve, scipy
from django.views.decorators.csrf import csrf_exempt
import logging
from scipy import interpolate

# Get an instance of a logger
logger = logging.getLogger(__name__)
N, L, n = 30, 8, 8
unitLength = L/(N-1)
convRate = 0.00107

# Center of the image
scenePosition = np.array([0.0,0.5,-.5]) 
sceneSize = np.array([1.0,1.0,1.0])

#For math
diag = np.ones([N])
diags = np.array([diag,-2*diag, diag])
D = scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
discreteLaplace = (scipy.sparse.kronsum(scipy.sparse.kronsum(D,D),D))
potentialCap = 10000000
baseV = np.zeros((N, N, N))
boundaryCond = (np.zeros((N, N, N)) > 0)
# baseV = np.pad(baseV, pad_width=1, mode='constant', constant_values=potentialCap) Border
Vsub2 = np.zeros((N, N, N))
Vsub1 = np.zeros((N, N, N))
x = np.linspace(-L/2,L/2,N)
y = np.linspace(-L/2,L/2,N)
z = np.linspace(-L/2,L/2,N)
velocities = np.zeros((N,N,N,3))
scalars = np.zeros((N,N,N))
X,Y,Z= np.meshgrid(x,y,z, indexing='ij')

coordinates = np.concatenate(
        (
            X[..., np.newaxis],
            Y[..., np.newaxis],
            Z[..., np.newaxis],
        ),
        axis=-1,
    )
boundingSquare = {
    "minx":-0.5,
    "maxx":0.5,
    "miny":-0.5,
    "maxy":0.5,
    "maxz":0,
    "minz":-1
}
def applyInverseQuaternion( v, q ):

    x = v[0]
    y = v[1]
    z = v[2] 

    qx = -q[1]
    qy = -q[0]
    qz = -q[2] 
    qw = q[3] 

    # calculate quat * vector

    ix = qw * x + qy * z - qz * y
    iy = qw * y + qz * x - qx * z
    iz = qw * z + qx * y - qy * x
    iw = - qx * x - qy * y - qz * z

    # calculate result * inverse quat

    x = ix * qw + iw * - qx + iy * - qz - iz * - qy
    y = iy * qw + iw * - qy + iz * - qx - ix * - qz
    z = iz * qw + iw * - qz + ix * - qy - iy * - qx

    return np.array([x,y,z])

def potential(camPos, camQuat, conv, width, height, image):
    # project forwards
    # 
    whratio = width/height
    fov = 80
    size = 0.25*2*np.tan( (2*np.pi/360)*(fov/(2* whratio)) )

    # Does this need to be done every potential? (yes?)
    zDistance = -conv*(image[::2] + 255*image[1::2])
    xDistance, yDistance= np.meshgrid( np.linspace(-size/2, size/2, height), np.linspace(-whratio*size/2,  whratio*size/2, width))
    xDistance = xDistance.reshape( width* height)*zDistance 
    yDistance = yDistance.reshape( width* height)*zDistance 

    depthPoints = np.array([xDistance, yDistance, zDistance])
    depthPoints = applyInverseQuaternion(depthPoints, camQuat).T
    depthPoints += np.array([camPos[1],camPos[0],camPos[2]])
    # cut for square
    depthPoints = depthPoints[ 
        (depthPoints[:,0] > boundingSquare['minx']) & (depthPoints[:,0] < boundingSquare['maxx']) & 
        (depthPoints[:,1] > boundingSquare['miny']) & (depthPoints[:,1] < boundingSquare['maxy']) & 
        (depthPoints[:,2] > boundingSquare['minz']) & (depthPoints[:,2] < boundingSquare['maxz'])
    ]
    depthPoints[:,0] = np.floor( (depthPoints[:,0] - boundingSquare['minx'] )*N ) 
    depthPoints[:,1] = np.floor( (depthPoints[:,1] - boundingSquare['miny'] )*N ) 
    depthPoints[:,2] = np.floor( (depthPoints[:,2] - boundingSquare['minz'] )*N ) 
    depthPoints = np.floor(depthPoints).astype(int)
    
    V = np.zeros((30,30,30))
    V[ depthPoints[:,0], depthPoints[:,1], depthPoints[:,2]] = potentialCap
    
    return V


dt = 0.4
viscosity = 0.0001


# advect backtracing streamlines (intake is flattened)
# check
def addAdvection(field, vectorField):
    backTrackPositions = np.clip(coordinates - dt* vectorField, -L/2, L/2)
    advectedField = interpolate.interpn(
        points = (x,y,z),
        values= field,
        xi=backTrackPositions
    )
    advectedField[boundaryCond] = np.array([0,0,0])
    return advectedField

# diffuse
def addDiffusion(vectorFieldFlattened):
    vectorField = vectorFieldFlattened.reshape(N,N,N,3)
    # should we use sparse or 
    laplace = discreteLaplace @ vectorFieldFlattened.reshape(N**3,3)/(unitLength)**2#does this work?
    diffusionApplied = vectorField - viscosity*dt*laplace.reshape(N,N,N,3)
    diffusionApplied[boundaryCond] = np.array([0,0,0])
    return diffusionApplied.flatten()

def partial(field, axis=0):
    diff = np.zeros_like(field)
    if(axis==0):
        diff[1:-1, 1:-1, 1:-1] = (
            (field[2:,1:-1,1:-1]-field[:-2,1:-1,1:-1])/(2*unitLength)
        )
    elif(axis==1):
        diff[1:-1, 1:-1, 1:-1] = (
            (field[1:-1,2:,1:-1]-field[1:-1,:-2,1:-1])/(2*unitLength)
        )
    elif(axis==2):
        diff[1:-1, 1:-1, 1:-1] = (
            (field[1:-1,1:-1,2:]-field[1:-1,1:-1,:-2])/(2*unitLength)
        )
    return diff


def divergence(field):
    # This isn't including the boundary conditions...
    return ((
        partial(field,0)[:,:,:,0]+
        partial(field,1)[:,:,:,1]+
        partial(field,2)[:,:,:,2]
    ))

def gradient(field):
    return np.concatenate(
    (
        partial(field,0)[..., np.newaxis],
        partial(field,1)[..., np.newaxis],
        partial(field,2)[..., np.newaxis]
    ),
        axis = -1
    )

def curl(field):
    pass

def poisson(field_flattened):
    return ((discreteLaplace @ field_flattened)/unitLength**2)

# project

import time
forceField = np.zeros((N,N,N,3))
def fluidFunc():
    global forceField
    global velocities
    
    forceField[ -5:-2, int(N/2-3):int(N/2+3), int(N/2-3):int(N/2+3),  0] *= 0.7

    # 1. Force (checked)
    velocitiesForce = velocities + forceField*dt
    velocitiesForce[boundaryCond] = np.array([0,0,0])

    # 2. Advection (checked)
    velocitiesAdv = addAdvection(velocitiesForce, velocitiesForce)

    # 3. Diffusion
    velocitiesDif = sciSolve.cg(
        A = sciSolve.LinearOperator(
            shape = ( ((N**3)*3), ((N**3)*3) ),
            matvec = addDiffusion
        ),
        b = velocitiesAdv.flatten(),
        maxiter = None
    )[0].reshape(N,N,N,3)
    # 4.1. Pressure
    pressure = sciSolve.cg(
        A= sciSolve.LinearOperator(
            shape = ( (N**3), (N**3) ),
            matvec = poisson
        ),
        b= divergence(velocitiesDif).flatten(),
        maxiter = None
    )[0].reshape(N,N,N)
    # 4.2. Projections
    
    velocitiesProj =  velocitiesDif - gradient(pressure)
    velocities = velocitiesProj
    return velocities


import time
lastTime = time.time()
@csrf_exempt
def fluid(request):
    global lastTime,dt
    thisTime = time.time()
    dt = thisTime-lastTime
    lastTime = thisTime
    global boundaryCond
    global forceField
    image = np.array(json.loads(request.POST.get("image")))
    # fluid = json.loads(request.POST.get("fluid"))
    pose = json.loads(request.POST.get("pose"))
    action = json.loads(request.POST.get("action"))
    if action['force']==1:
        forceField[ -5:-2, int(N/2-3):int(N/2+3), int(N/2-3):int(N/2+3),  0] = -6
    if action['reset']==1:
        global velocities
        velocities = np.zeros((N,N,N,3))
        forceField = np.zeros((N,N,N,3))
    
    camPos, camQuat, conversionRate, height, width = pose
    V = potential(camPos, camQuat, conversionRate, width, height, image)
    # steps 
    boundaryCond = (V>0)
    vels = fluidFunc().reshape(N**3,3)
    # Vsub2 = Vsub1
    # Vsub1 = V
    return HttpResponse(
        json.dumps(vels.tolist())
    )

