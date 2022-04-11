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
