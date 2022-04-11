#Is this optimal?
#Glass is the glass grid being used. probs is the function being moved to the glass
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
    v1 = ratio[:,:,:,0]*ratio[:,:,:,1]*ratio[:,:,:,2]*probs[bottoms[:,:,:,0],bottoms[:,:,:,1],bottoms[:,:,:,2]]
    v2 = ratio[:,:,:,0]*ratio[:,:,:,1]*ratioI[:,:,:,2]*probs[bottoms[:,:,:,0],bottoms[:,:,:,1],tops[:,:,:,2]]
    v3 = ratio[:,:,:,0]*ratioI[:,:,:,1]*ratioI[:,:,:,2]*probs[bottoms[:,:,:,0],tops[:,:,:,1],tops[:,:,:,2]]
    v4 = ratioI[:,:,:,0]*ratioI[:,:,:,1]*ratioI[:,:,:,2]*probs[tops[:,:,:,0],tops[:,:,:,1],tops[:,:,:,2]]
    v5 = ratioI[:,:,:,0]*ratio[:,:,:,1]*ratioI[:,:,:,2]*probs[tops[:,:,:,0],bottoms[:,:,:,1],tops[:,:,:,2]]
    v6 = ratioI[:,:,:,0]*ratio[:,:,:,1]*ratio[:,:,:,2]*probs[tops[:,:,:,0],bottoms[:,:,:,1],bottoms[:,:,:,2]]
    v7 = ratioI[:,:,:,0]*ratioI[:,:,:,1]*ratio[:,:,:,2]*probs[tops[:,:,:,0],tops[:,:,:,1],bottoms[:,:,:,2]]
    v8 = ratio[:,:,:,0]*ratioI[:,:,:,1]*ratio[:,:,:,2]*probs[bottoms[:,:,:,0],tops[:,:,:,1],bottoms[:,:,:,2]]
    return v1+v2+v3+v4+v5+v6+v7+v8
