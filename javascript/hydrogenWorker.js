importScripts('https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.1.1/math.js')
let cartesianToSpherical = (x,y,z) => {
    let r = Math.sqrt(x**2+y**2+z**2)
    let theta = Math.atan2(y,x)
    let phi = Math.acos(z/ r)
    return [r, theta, phi]
}
let sphereToCartesian = ( r, theta, phi) => {
	let x= r * Math.sin(phi)* Math.cos(theta)
	let y= r * Math.sin(phi)* Math.sin(theta)
	let z= r * Math.cos(phi)
    return [x, y, z]
}

let legendrePoly = '0'
let laguerrePoly = '0'
let harmonicScale = 0
let normalization = 0
let m = 0
let l = 0
let n = 1
let a = 0.529*2//bohr radius 5e-11m 
let createLegendreExpression = (m, l)=>{
    express = `(x^2 - 1 )^${l}`
    for(let k=0; k<l+m; k++){
        express = math.derivative(express,'x')
    }
    // is that the best way to handle factorial?
    return `(-1)^${m}*((1-x^2)^(${m}/2))*(${express})/((2^${l})*${l}!)`
}
let createLaguerreExpression = (alpha, n)=>{
    express = `e^(-x)*x^(${n+alpha})`
    for(let k=0; k<n; k++){
        express = math.derivative(express,'x')
    }
    return `x^(-${alpha})*e^x/${n}!*(${express})`
}
let createHarmonicScaleValue = (m, l)=>{
    return math.evaluate( `sqrt((${2*l+1})/(${4*Math.PI})*(${l-m})!/(${l+m})!)`)
}
let createNormalizationValue = (n, l, a)=>{
    return math.evaluate(`sqrt(${8/(n*a)**3}*(${n-l-1})!/(${2*n}*(${n+l})!))`)
}
//sphericalHamonic
let sH = (m, l, theta, phi)=>{
    legendre = math.evaluate(`(${legendrePoly})`, {x:Math.cos(theta)})
    phase = `e^(1i*${m}*${phi})` 
    return `${harmonicScale}*${phase}*${legendre}`
}
let waveFunc = (r, theta, phi, n, l, m)=>{//bohr radius
    let rho = 2*r/(n*a)//density
    let glp = math.evaluate( laguerrePoly, {x:rho})
    let shv = math.evaluate( sH(m, l, theta, phi) )//complex number...
    return math.evaluate(
        `${normalization} * e^(${-rho/2}) * ${rho**l} * ${glp} * (${shv})`
    )
}

let complexNumToPolar = (complexStr)=>{
    let complex = math.complex(complexStr)
    let real = complex.re
    let im = complex.im
    r = Math.sqrt(real**2 + im**2)
    phase = Math.atan2(complex.im, complex.re)
    return [r, phase]
}

onmessage = function(e) {
    if(e.data.type == 'start'){
        n = parseInt(e.data.n)
        l = parseInt(e.data.l)
        m = parseInt(e.data.m)
        console.log([n, l, m])
        laguerrePoly = createLaguerreExpression(2*l +1, n-l-1)
        legendrePoly = createLegendreExpression(m, l)
        harmonicScale = createHarmonicScaleValue(m, l)
        normalization = createNormalizationValue(n, l, a)
        let gridIn = []
        for(let i = 0; i<grid.length; i++){ 
            let [x,y,z] = grid[i].map(x=>x*(4*n))
            let [r, theta, phi] =  cartesianToSpherical(x, y, z)
        	r = isNaN(r)? 0 : r
        	theta = isNaN(theta)? 0 : theta
            let waveVal = waveFunc(r, theta, phi, n, l, m)
            let [waveR, wavePhase] = complexNumToPolar(waveVal)
            gridIn.push([waveR, wavePhase])
        }
	    postMessage({
            grid:gridIn
        });
    }
    if(e.data.type == 'grid'){
        grid = e.data.grid
        laguerrePoly = createLaguerreExpression(2*l +1, n-l-1)
        legendrePoly = createLegendreExpression(m, l)
        harmonicScale = createHarmonicScaleValue(m, l)
        normalization = createNormalizationValue(n, l, a)
        let gridIn = []
        for(let i = 0; i<grid.length; i++){ 
            let [x,y,z] = grid[i].map(x=>x*(4*n))
            let [r, theta, phi] =  cartesianToSpherical(x, y, z)
        	r = isNaN(r)? 0 : r
        	theta = isNaN(theta)? 0 : theta
            let waveVal = waveFunc(r, theta, phi, n, l, m)
            let [waveR, wavePhase] = complexNumToPolar(waveVal)
            gridIn.push([waveR, wavePhase])
        }
	    postMessage({
            grid:gridIn
        });
    }

}
