# scipy
import numpy as np,scipy.sparse.linalg as sciSolve, scipy
N, L, n = 30, 8, 20
diag = np.ones([N],dtype='c8')
diags = np.array([diag,-2*diag, diag],dtype='c8')
D = scipy.sparse.spdiags(diags, np.array([-1,0,1]), N, N)      
T = -0.5*(scipy.sparse.kronsum(scipy.sparse.kronsum(D,D),D))
X,Y,Z= np.meshgrid(np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N),np.linspace(-L/2,L/2,N))
V = scipy.sparse.diags((0.0002*((Y)**2+(Z)**2+(X)**2)).reshape(N**3))
eigenvalues, eigenvectors = sciSolve.eigsh(T+V,n, which='SM')
wave = eigenvectors.T[n-1].reshape((N,N,N))
complexAngle = np.angle(wave)
realWave = wave*np.exp(-1j*complexAngle)
