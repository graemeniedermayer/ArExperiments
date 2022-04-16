from flask import Flask, request,json
from flask_cors import CORS
import numpy as np,scipy.sparse.linalg as sciSolve, scipy

N, L, n = 30, 8, 20
app = Flask(__name__)
CORS(app)
scenePosition = np.array([0,0,-1])
sceneSize = np.array([1.0,1.0,1.0])
glass = np.array(json.load(open('miniGlass.json')))

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

def potential(position, image):
    return 

@app.route("/", methods=['POST'])
def wavefunc():
  #assume a particular location
  content = request.get_json(silent=True)# scipy
  [position, image] = content
  diag = np.ones([N],dtype='c8')
  diags = np.array([diag,-2*diag, diag],dtype='c8')
  D = scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
  T = -0.5*(scipy.sparse.kronsum(scipy.sparse.kronsum(D,D),D))
  X,Y,Z= np.meshgrid(np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N))
  V = scipy.sparse.diags((0.0002*((Y)**2+(Z)**2+(X)**2)).reshape(N**3))
  eigenvalues, eigenvectors = sciSolve.eigsh(T+V,n, which='SM')
  wave = eigenvectors.T[n-1].reshape((N,N,N))
  complexAngle = np.angle(wave[0])
  realWave = wave*np.exp(-1j*complexAngle)
  waveFunc = glassVal(glass, realWave)

  return json.dumps([eigenvalues, waveFunc])
