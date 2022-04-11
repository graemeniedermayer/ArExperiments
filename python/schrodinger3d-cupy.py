import cupyx,numpy as np,cupyx.scipy.sparse.linalg as sciSolve,cupy as cp
N, L, n = 50, 8, 10
diag = np.ones([N],dtype='c8')
diags = np.array([diag,-2*diag, diag],dtype='c8')
D = cupyx.scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
T = -0.5*(cupyx.scipy.sparse.kronsum(cupyx.scipy.sparse.kronsum(D,D),D))
X,Y,Z= np.meshgrid(np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N))
V = cupyx.scipy.sparse.diags((0.0001*((Y)**2+(Z)**2+(X)**2)).reshape(N**3))
eigenvalues, eigenvectors = sciSolve.eigsh(T+V,n)
eprobs = cp.asnumpy(eigenvectors.T[n-1].reshape((N,N,N)))


# this isn't the greatest..... assume arrays?
def glassVal(glass,probs):
    maxVal = L*(1/2-1/N)
    minVal = -maxVal
    glass[glass>maxVal] = maxVal
    glass[glass<minVal] = minVal
    indexs = (np.array(glass)/(L/N)) + N/2
    bottoms = np.floor(indexs).astype(int)
    tops = np.ceil(indexs).astype(int)
    ratio = indexs-bottoms
    ratioI = ratio - 1
    v1 = ratio[:,2]*ratio[:,1]*ratio[:,0]*probs[bottoms[:,0],bottoms[:,1],bottoms[:,2]]
    v2 = ratio[:,2]*ratio[:,1]*ratioI[:,0]*probs[bottoms[:,0],bottoms[:,1],tops[:,2]]
    v3 = ratio[:,2]*ratioI[:,1]*ratioI[:,0]*probs[bottoms[:,0],tops[:,1],tops[:,2]]
    v4 = ratioI[:,2]*ratioI[:,1]*ratioI[:,0]*probs[tops[:,0],tops[:,1],tops[:,2]]
    v5 = ratioI[:,2]*ratio[:,1]*ratioI[:,0]*probs[tops[:,0],bottoms[:,1],tops[:,2]]
    v6 = ratioI[:,2]*ratio[:,1]*ratio[:,0]*probs[tops[:,0],bottoms[:,1],bottoms[:,2]]
    v7 = ratioI[:,2]*ratioI[:,1]*ratio[:,0]*probs[tops[:,0],tops[:,1],bottoms[:,2]]
    v8 = ratio[:,2]*ratioI[:,1]*ratio[:,0]*probs[bottoms[:,0],tops[:,1],bottoms[:,2]]
    return v1+v2+v3+v4+v5+v6+v7+v8
