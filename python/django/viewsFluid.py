from cv2 import Laplacian
from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse
import json
import numpy as np,scipy.sparse.linalg as sciSolve, scipy
from django.views.decorators.csrf import csrf_exempt
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)
N, L, n = 30, 8, 8
unitLength = L/(N-1)
convRate = 0.00107

# Center of the image
scenePosition = np.array([0.0,0.5,-.5]) 
sceneSize = np.array([1.0,1.0,1.0])
glass = np.array(json.load(open('miniGlass.json')))

#For math
diag = np.ones([N],dtype='c8')
diags = np.array([diag,-2*diag, diag],dtype='c8')
D = scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
discreteLaplace = (scipy.sparse.kronsum(scipy.sparse.kronsum(D,D),D))
potentialCap = 10000000
baseV = np.zeros((N, N, N))
# baseV = np.pad(baseV, pad_width=1, mode='constant', constant_values=potentialCap) Border
Vsub2 = np.zeros((N, N, N))
Vsub1 = np.zeros((N, N, N))
x = np.linspace(-L/2,L/2,N)
y = np.linspace(-L/2,L/2,N)
z = np.linspace(-L/2,L/2,N)
velocities = np.zeros((N,N,N,3))
scalars = np.zeros((N,N,N))
X,Y,Z= np.meshgrid(x,y,z)
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

# using stable fluids jos stam


dt = 0.02
viscosity = 0.1
forceFactor = 0.002
coords = np.array([X.flatten(), Y.flatten(), Z.flatten()])

# force
def addForce(field, forceField):
    return field + forceField*dt

# advect backtracing streamlines (intake is flattened)
def addAdvection(field, vectorField):
    backTrackPositions = np.clip(field - dt* vectorField, -L/2, L/2)
    advectedField = scipy.interpolate.interpn(
        points = (x,y,z),
        values= field,
        xi=backTrackPositions
    )
    return advectedField

# diffuse
def addDiffusion(field, vectorFieldFlattened):
    vectorField = vectorFieldFlattened.reshape(N,N,N,3)
    laplace = discreteLaplace*field/(unitLength)**2#does this work?
    diffusionApplied = vectorField + viscosity*dt*laplace
    return diffusionApplied.flatten()

def divergence(field):
    # This isn't including the boundary conditions...
    return ((
        (field[1:,:,:,0]-field[:-1,:,:,0])+
        (field[:,1:,:,0]-field[:,:-1,:,0])+
        (field[:,:,1:,0]-field[:,:,:-1,0])
    )/2*unitLength)

def gradient(field):
    return np.concatenate(
    (
        (field[1:,:,:,0]-field[:-1,:,:,0]).reshape(N,N,N,1)/2*unitLength,
        (field[:,1:,:,0]-field[:,:-1,:,0]).reshape(N,N,N,1)/2*unitLength,
        (field[:,:,1:,0]-field[:,:,:-1,0]).reshape(N,N,N,1)/2*unitLength
    ),
        axis = -1
    )

def curl(field):
    pass

def poisson(field_flattened):
    field = field_flattened.reshape(N,N,N)
    return (discreteLaplace*field/(unitLength)**2).flatten()

# project
def addProjection(w3k, k, kmag):
    # is this the right magnitude?
    kmag = np.linalg.norm(k,ord=1)
    w4k = w3k - 1/kmag**2 * np.dot(k,w3k) * k
    return w4k

import time
@csrf_exempt
def fluid(request):
    image = np.array(json.loads(request.POST.get("image")))
    fluid = json.loads(request.POST.get("fluid"))
    pose = json.loads(request.POST.get("pose"))
    camPos, camQuat, conversionRate, height, width = pose
    V = potential(camPos, camQuat, conversionRate, width, height, image)
    # steps 
    forceField = forceFactor*(dt**2)*(V - 2*Vsub1 + Vsub2)
    velocitiesForce = addForce(velocities, forceField)
    velocitiesAdv = addAdvection(velocitiesForce, velocitiesForce)
    velocitiesDif = sciSolve.cg(
        A = sciSolve.LinearOperator(
            shape = ( (N**3*3), (N**3*3) ),
            matvec = addDiffusion
        ),
        b = velocitiesAdv.flatten(),
        maxIter = None
    )[0].reshape(N,N,N,3)
    pressure = sciSolve.cg(
        A= sciSolve.LinearOperator(
            shape = ( (N**3), (N**3) ),
            matvec = poisson
        ),
        b= divergence(velocitiesDif).flatten(),
        maxIter = None
    )[0].reshape(N,N,N)
    velocitiesProj =  velocitiesDif - gradient(pressure)
    velocities = velocitiesProj
    Vsub2 = Vsub1
    Vsub1 = V
    return HttpResponse(
        json.dumps([])
    )

