from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse
import json
import numpy as np,scipy.sparse.linalg as sciSolve, scipy
from django.views.decorators.csrf import csrf_exempt
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)

import os
import sys
import glob
import argparse
import numpy as np
import PIL.Image as pil
import matplotlib as mpl
import matplotlib.cm as cm

import torch
from torchvision import transforms, datasets

import networks as networks
from layers import disp_to_depth
from utils import download_model_if_doesnt_exist
from evaluate_depth import STEREO_SCALE_FACTOR


"""Function to predict for a single image or folder of images
"""
if torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")

download_model_if_doesnt_exist("mono+stereo_640x192")
model_path = os.path.join("models", "mono+stereo_640x192")
print("-> Loading model from ", model_path)
encoder_path = os.path.join(model_path, "encoder.pth")
depth_decoder_path = os.path.join(model_path, "depth.pth")

# LOADING PRETRAINED MODEL
print("   Loading pretrained encoder")
encoder = networks.ResnetEncoder(18, False)
loaded_dict_enc = torch.load(encoder_path, map_location=device)
# extract the height and width of image that this model was trained with
feed_height = loaded_dict_enc['height']
feed_width = loaded_dict_enc['width']
filtered_dict_enc = {k: v for k, v in loaded_dict_enc.items() if k in encoder.state_dict()}
encoder.load_state_dict(filtered_dict_enc)
encoder.to(device)
encoder.eval()
print("   Loading pretrained decoder")

depth_decoder = networks.DepthDecoder(
    num_ch_enc=encoder.num_ch_enc, scales=range(4))
loaded_dict = torch.load(depth_decoder_path, map_location=device)
depth_decoder.load_state_dict(loaded_dict)
depth_decoder.to(device)
depth_decoder.eval()
index = 0
def tensorFunc(original_width, original_height, image,index):


    # PREDICTING ON EACH IMAGE IN TURN
    with torch.no_grad():
        # Load image and preprocess
        input_image = pil.fromarray(np.uint8(image)).convert('RGB')
        input_image = input_image.resize((feed_width, feed_height), pil.LANCZOS)
        input_image = transforms.ToTensor()(input_image).unsqueeze(0)

        # PREDICTION
        input_image = input_image.to(device)
        features = encoder(input_image)
        outputs = depth_decoder(features)
        disp = outputs[("disp", 0)]
        disp_resized = torch.nn.functional.interpolate(
            disp, (original_height, original_width), mode="bilinear", align_corners=False)
        # Saving numpy file
        scaled_disp, depth = disp_to_depth(disp, 0.1, 100)
        metric_depth = STEREO_SCALE_FACTOR * depth.cpu().numpy()
        # Saving colormapped depth image
        disp_resized_np = disp_resized.squeeze().cpu().numpy()
        vmax = np.percentile(disp_resized_np, 95)
        normalizer = mpl.colors.Normalize(vmin=disp_resized_np.min(), vmax=vmax)
        mapper = cm.ScalarMappable(norm=normalizer, cmap='magma')
        colormapped_im = (mapper.to_rgba(disp_resized_np)[:, :, :3] * 255).astype(np.uint8)
        im = pil.fromarray(metric_depth[0,0,:,:])

    np.save('imageOut'+str(index)+'.npy', im)
    return np.array(im)

import time
@csrf_exempt
def monodepth2(request):
    image = np.array(json.loads(request.POST.get("image"))).reshape(192,640).T.reshape(640,192)
    pose = json.loads(request.POST.get("pose"))
    global index
    index+=1
    np.save('image'+str(index)+'.npy', image)
    width, height = pose
    imageOut = tensorFunc( width, height, image,index)
    imageWidth = imageOut.shape[0]
    imageHeight = imageOut.shape[1]
    return HttpResponse(
        json.dumps( [imageOut.T.reshape(192,640).reshape(imageWidth*imageHeight).tolist() , imageWidth, imageHeight] )
    )


