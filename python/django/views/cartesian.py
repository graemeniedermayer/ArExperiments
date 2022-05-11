from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse
import json
import numpy as np,scipy.sparse.linalg as sciSolve, scipy
from django.views.decorators.csrf import csrf_exempt
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)
N, L, n = 30, 8, 8
convRate = 0.00107

# Center of the image
scenePosition = np.array([0.0,0.5,-.5]) 
sceneSize = np.array([1.0,1.0,1.0])
glass = np.array(json.load(open('miniGlass.json')))

#For math
diag = np.ones([N])
diags = np.array([diag,-2*diag, diag])
D = scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
T = -0.5*(scipy.sparse.kronsum(scipy.sparse.kronsum(D,D),D))
potentialCap = 0.01
baseV = np.zeros((30,30,30))
# baseV = np.pad(baseV, pad_width=1, mode='constant', constant_values=potentialCap) Border


X,Y,Z= np.meshgrid(np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N))
boundingSquare = {
    "minx":-0.5,
    "maxx":0.5,
    "miny":-0.5,
    "maxy":0.5,
    "maxz":0,
    "minz":-1
}
def applyQuaternion( v, q ):

    x = v[0]
    y = v[1]
    z = v[2] 

    qx = q[1]
    qy = q[0]
    qz = q[2] 
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
def applyInverseQuaternion( v, q ):

    x = v[0]
    y = v[1]
    z = v[2] 
#     yes this is in fact correct q[0] and q[1] need to be switched
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

# this isn't the greatest..... assume arrays?
def glassVal(glass,probs):
    indexs = (np.array(glass)/(L/N)) + N/2
    indexs[indexs>N-1]= N-1
    bottoms = np.floor(indexs).astype(int)
    tops = np.ceil(indexs).astype(int)
    ratio = indexs-bottoms
    ratioI = 1 - ratio
    v1 = ratio[:,0]*ratio[:,1]*ratio[:,2]*probs[bottoms[:,0],bottoms[:,1],bottoms[:,2]]
    v2 = ratio[:,0]*ratio[:,1]*ratioI[:,2]*probs[bottoms[:,0],bottoms[:,1],tops[:,2]]
    v3 = ratio[:,0]*ratioI[:,1]*ratioI[:,2]*probs[bottoms[:,0],tops[:,1],tops[:,2]]
    v4 = ratioI[:,0]*ratioI[:,1]*ratioI[:,2]*probs[tops[:,0],tops[:,1],tops[:,2]]
    v5 = ratioI[:,0]*ratio[:,1]*ratioI[:,2]*probs[tops[:,0],bottoms[:,1],tops[:,2]]
    v6 = ratioI[:,0]*ratio[:,1]*ratio[:,2]*probs[tops[:,0],bottoms[:,1],bottoms[:,2]]
    v7 = ratioI[:,0]*ratioI[:,1]*ratio[:,2]*probs[tops[:,0],tops[:,1],bottoms[:,2]]
    v8 = ratio[:,0]*ratioI[:,1]*ratio[:,2]*probs[bottoms[:,0],tops[:,1],bottoms[:,2]]
    return v1+v2+v3+v4+v5+v6+v7+v8


def potential(worldMatrix, conv, width, height, image):
    # project forwards
    # 
    size = 0.125*2*np.tan( 2*np.pi*80/(2*360) )
    whratio = width/height

    # this is wrong.
    zDistance = conv*(image[::2] + 255*image[1::2]).reshape(width,height)
    # this might be noooo good
    xDistance, yDistance= np.meshgrid( np.linspace(-size/2, size/2, height), np.linspace(- whratio*size/2, whratio*size/2, width) )
    
    # convert to the correct reference frame
    # this is apply4matrix function with numpy arrays
    e = worldMatrix
    w = 1/( e[ 3 ] * xDistance + e[ 7 ] * yDistance+ e[ 11 ] * zDistance + e[ 15 ])
    x = ( e[ 0 ] * xDistance + e[ 4 ] * yDistance + e[ 8 ] * zDistance+ e[ 12 ] ) * w
    y = ( e[ 1 ] * xDistance + e[ 5 ] * yDistance + e[ 9 ] * zDistance+ e[ 13 ] ) * w
    z = ( e[ 2 ] * xDistance + e[ 6 ] * yDistance + e[ 10 ] * zDistance + e[ 14 ] ) * w
    depthPoints = np.array([x, y, z]).T

    # cut for square
    depthPoints = depthPoints[ 
        (depthPoints[:,:,0] > boundingSquare['minx']) | (depthPoints[:,:,0] < boundingSquare['maxx']) | 
        (depthPoints[:,:,1] > boundingSquare['miny']) | (depthPoints[:,:,1] < boundingSquare['maxy']) | 
        (depthPoints[:,:,2] > boundingSquare['minz']) | (depthPoints[:,:,2] < boundingSquare['maxz'])
    ]
    depthPoints = np.floor(depthPoints*N).astype(int)
    # depth.floor?
    V = np.copy(baseV)
    V[ depthPoints[:,0], depthPoints[:,1], -depthPoints[:,2]] = potentialCap
    
    return scipy.sparse.diags(V.reshape(N**3))

def potentialSimple(camPos, camQuat, conv, width, height, image):
    # project forwards
    # 
    whratio = width/height
    fov = 80
    size = 0.25*2*np.tan( (2*np.pi/360)*(fov/(2* whratio)) )

    # this is wrong.
    zDistance = -conv*(image[::2] + 255*image[1::2])
    xDistance, yDistance= np.meshgrid( np.linspace(-size/2, size/2, height), np.linspace(-whratio*size/2,  whratio*size/2, width))
    xDistance = xDistance.reshape( width* height)*zDistance 
    yDistance = yDistance.reshape( width* height)*zDistance 

    depthPoints = np.array([xDistance, yDistance, zDistance])
    depthPoints = applyInverseQuaternion(depthPoints, camQuat).T
    depthPoints += np.array([camPos[1],camPos[0],camPos[2]])
    np.save('depth.npy', depthPoints)
    # cut for square
    depthPoints = depthPoints[ 
        (depthPoints[:,0] > boundingSquare['minx']) & (depthPoints[:,0] < boundingSquare['maxx']) & 
        (depthPoints[:,1] > boundingSquare['miny']) & (depthPoints[:,1] < boundingSquare['maxy']) & 
        (depthPoints[:,2] > boundingSquare['minz']) & (depthPoints[:,2] < boundingSquare['maxz'])
    ]
    np.save('depthCut.npy', depthPoints)
    depthPoints[:,0] = np.floor( (depthPoints[:,0] - boundingSquare['minx'] )*N ) 
    depthPoints[:,1] = np.floor( (depthPoints[:,1] - boundingSquare['miny'] )*N ) 
    depthPoints[:,2] = np.floor( (depthPoints[:,2] - boundingSquare['minz'] )*N ) 
    depthPoints = np.floor(depthPoints).astype(int)
    # depth.floor?
    V = np.zeros((30,30,30))
    V[ depthPoints[:,0], depthPoints[:,1], depthPoints[:,2]] = potentialCap
    
    return V.reshape(N**3)

def potentialGlass(camPos, camQuat, conv, width, height, image):
    # project forwards
    # 
    whratio = width/height
    fov = 80
    size = 0.25*2*np.tan( (2*np.pi/360)*(fov/(2* whratio)) )

    # this is wrong.
    zDistance = -conv*(image[::2] + 255*image[1::2])
    xDistance, yDistance= np.meshgrid( np.linspace(-size/2, size/2, height), np.linspace(-whratio*size/2,  whratio*size/2, width))
    xDistance = xDistance.reshape( width* height)*zDistance 
    yDistance = yDistance.reshape( width* height)*zDistance 

    depthPoints = np.array([xDistance, yDistance, zDistance])
    depthPoints = applyInverseQuaternion(depthPoints, camQuat).T
    depthPoints += np.array([camPos[1],camPos[0],camPos[2]])
    np.save('depth.npy', depthPoints)
    # cut for square
    depthPoints = depthPoints[ 
        (depthPoints[:,0] > boundingSquare['minx']) & (depthPoints[:,0] < boundingSquare['maxx']) & 
        (depthPoints[:,1] > boundingSquare['miny']) & (depthPoints[:,1] < boundingSquare['maxy']) & 
        (depthPoints[:,2] > boundingSquare['minz']) & (depthPoints[:,2] < boundingSquare['maxz'])
    ]
    np.save('depthCut.npy', depthPoints)
    depthPoints[:,0] = np.floor( (depthPoints[:,0] - boundingSquare['minx'] )*N ) 
    depthPoints[:,1] = np.floor( (depthPoints[:,1] - boundingSquare['miny'] )*N ) 
    depthPoints[:,2] = np.floor( (depthPoints[:,2] - boundingSquare['minz'] )*N ) 
    depthPoints = np.floor(depthPoints).astype(int)
    # depth.floor?
    V = np.zeros((30,30,30))
    V[ depthPoints[:,0], depthPoints[:,1], depthPoints[:,2]] = potentialCap
    
    return V

@csrf_exempt
def test(request):
    return HttpResponse('test')

import time
@csrf_exempt
def infinite(request):  
    image = np.array(json.loads(request.POST.get("image")))
    eigenval = int(request.POST.get("eigenvalue") )
    pose = json.loads(request.POST.get("pose"))
    start = time.time()
    print("starting")
    print(eigenval)
    worldMatrix, conversionRate, height, width = pose 
    V = potential( worldMatrix, conversionRate, width, height, image)
    eigenvalues, eigenvectors = sciSolve.eigsh(T+V,n, which='SM')
    end = time.time()
    print(end - start)
    wave = eigenvectors.T[eigenval].reshape((N,N,N))
    # complexAngle = np.angle(wave[0])
    # realWave = wave*np.exp(-1j*complexAngle)
    waveFunc = glassVal(glass, wave)

    # phase? + r?
    return HttpResponse(
        json.dumps([eigenvalues.tolist(), waveFunc.astype(str).tolist()])
    )
    # return HttpResponse(json.dumps(eigenvalues.tolist()) )

@csrf_exempt
def returnPotential(request):
    image = np.array(json.loads(request.POST.get("image")))
    pose = json.loads(request.POST.get("pose"))
    camPos, camQuat, conversionRate, height, width = pose
    return HttpResponse(
        json.dumps( potentialSimple(camPos, camQuat, conversionRate, width, height, image).tolist() )
    )

@csrf_exempt
def returnGlass(request):
    image = np.array(json.loads(request.POST.get("image")))
    pose = json.loads(request.POST.get("pose"))
    camPos, camQuat, conversionRate, height, width = pose 
    return HttpResponse(
        json.dumps( glassVal(glass, potentialGlass(camPos, camQuat, conversionRate, width, height, image) ).tolist() )
    )
