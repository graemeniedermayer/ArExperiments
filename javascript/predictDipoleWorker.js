
importScripts('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');

difH = 0.000001
learningRate = 0.01
xaxis = new THREE.Vector3(1,0,0)
yaxis = new THREE.Vector3(0,1,0)
zaxis = new THREE.Vector3(0,0,1)

parameterizeMagField = (originOfExpectedMagnet, expectedMoment)=>{
    return (measuredPosition, measuredMagneticField = new THREE.Vector3(0,0,0) )=>{
        let radius = measuredPosition.clone().sub(originOfExpectedMagnet)
        let radLength = radius.length()
        let magneticMoment = expectedMoment.clone()
        // theory - measured = 0 (This should be zero if correct)
        return (
                radius.clone().multiplyScalar(
                    magneticMoment.dot(radius)*3/radLength**5
                ).sub(
                    magneticMoment.clone().multiplyScalar(1/radLength**3)
                )
            ).sub(measuredMagneticField)
    }
}
let gradDescent = (guess, results)=>{
    let [origin, moment] = guess
    // differentiate with respect to origin + magnetic moment (6 parameters?)
    let difMagFunc = (pos, magnet) => {
        mag = parameterizeMagField(origin, moment)(pos, magnet).length() //two sided dif would be more accurate
        return    [
            (parameterizeMagField(origin.clone().addScaledVector(xaxis,difH), moment)(pos, magnet).length() - mag)/difH,
            (parameterizeMagField(origin.clone().addScaledVector(yaxis,difH), moment)(pos, magnet).length() - mag)/difH,
            (parameterizeMagField(origin.clone().addScaledVector(zaxis,difH), moment)(pos, magnet).length() - mag)/difH,
        ]
    }
    error = [0,0,0]
    for(let result of results){
        pos = new THREE.Vector3().copy(result[0])
        mag = new THREE.Vector3().copy(result[1])
        let dif = difMagFunc(pos, mag)
        for(let j in error){
            error[j]+= dif[j]
        }
    }
    // Math sign
    error =  (new THREE.Vector3(Math.sign(error[0]),Math.sign(error[1]),Math.sign(error[2]) )).multiplyScalar(learningRate)
    newOrigin = origin.sub( error )
    newMoment = moment.clone()
    return [newOrigin, newMoment, error]
}

onmessage = function(e) {
    console.log(e)
    if(e.data.data){
        console.log(e.data.data)
        let pos = new THREE.Vector3().copy(e.data.data[0]);
        let mom = new THREE.Vector3().copy(e.data.data[1]);
        let res = e.data.data[2];
        let [magneticPosition, magneticMoment, error]= gradDescent([pos,mom], res);
	    postMessage({
            data:[magneticPosition, magneticMoment, error]
        });
    }

}
