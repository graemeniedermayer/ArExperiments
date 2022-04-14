
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
