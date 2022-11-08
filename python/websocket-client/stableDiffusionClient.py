#!/usr/bin/env python

#If using notice the servername and the path to stable diffusion
#This was using low mem stable diffusion.

import asyncio
import websocket
import ssl
import rel
import subprocess
import json,os, time
my_env = os.environ.copy()
from PIL import Image
import numpy as np

index = 0
def on_message(ws, message):
    global index
    values = json.loads(message)
    # websocket was acting up so I had to restart it (this is a workaround a bug I havent been able to fix)
    ws.close()
    # save image
    imageNP = np.uint8(values['image']).reshape(1024,512,4)

    PIL_image = Image.fromarray(imageNP, 'RGBA')
    PIL_image = PIL_image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    # is this async?
    PIL_image.save(str(index)+".png")
    seed = 2134
    subprocess.run('python3 optimizedSD/optimized_img2img.py --prompt "'+values['prompt']+'" --seed '+str(seed)+' --init-img "'+str(index)+''+'.png" --strength 0.43 --n_iter 1 --n_sample 1 --scale=10.5 --outdir ./', shell=True, env=my_env)
    outfileName = values['prompt'].replace(' ','_') + '/seed_'+str(seed) + '_' + f"{index:05}" + '.png'
    OUT_image = Image.open(outfileName)
    
    OUT_image.putalpha(255)
    OUT_image.transpose(Image.FLIP_TOP_BOTTOM)
    array = np.array(OUT_image).flatten()
    ws = websocket.WebSocketApp("wss://servername.com/ws/stableCompute/test",
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)
    ws.run_forever(dispatcher=rel, sslopt={"cert_reqs": ssl.CERT_NONE})  # Set dispatcher to automatic reconnection

    rel.signal(2, rel.abort)  # Keyboard Interrupt
    rel.dispatch()
    # for some reason ssl was giving me a too large error for the first websocket
    ws.send(json.dumps({'data':array.tolist()}, separators=(',', ':')))
    index+=1

def on_error(ws, error):
    print(error)

def on_close(ws, close_status_code, close_msg):
    print("### closed ###")

def on_open(ws):
    print("Opened connection")

if __name__ == "__main__":
    websocket.enableTrace(True)
    ws = websocket.WebSocketApp("wss://servername.com/ws/stableCompute/test",
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    ws.run_forever(dispatcher=rel, sslopt={"cert_reqs": ssl.CERT_NONE})  # Set dispatcher to automatic reconnection

    rel.signal(2, rel.abort)  # Keyboard Interrupt
    rel.dispatch()
