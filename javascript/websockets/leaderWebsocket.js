document.getElementById('showQR').addEventListener('click',x=>{
    let el = document.getElementById("qrCode")
    if(el.style.display == 'none'){
        el.style.display = 'block'
    }else{
        el.style.display = 'none'
    }
})
