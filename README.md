# Augmented Reality Experiments
A set of experiments using augmented reality. WebXR + Threejs are the predominate tools used. 

### Youtube
This is a companion repo to the youtube channel https://www.youtube.com/channel/UC_EkMqKOm7Ej_g03Ryv0UZw/videos

## Demos

### Github pages
[All Demo](https://graemeniedermayer.github.io/ArExperiments/) 

#### Select Demos
[Skeleton](https://graemeniedermayer.github.io/ArExperiments/html/ArSkeleton.html)

[Photogrammetry](https://graemeniedermayer.github.io/ArExperiments/html/Photogrammetry.html)

[MagneticField](https://graemeniedermayer.github.io/ArExperiments/html/MagneticField.html) (requires chrome flag)

[Recording Values](https://graemeniedermayer.github.io/ArExperiments/html/arRecord.html) 

[AR Occlusion](https://graemeniedermayer.github.io/ArExperiments/html/depthOcclusion.html) 

[Mesh Capture with Depth api](https://graemeniedermayer.github.io/ArExperiments/html/depthMesh.html) 

## Caveats

### Chrome
These will only work on chromium derived browsers. Even then only chrome is particularly reliable.

### Chrome Flags
Many of these experiments require chrome flags enabled specifically: Experimental Web Platform Features and Generic Sensor Extra Classes enabled. These introduce some security issues so try to only visit trusted sites while using these flags (although I believe they aren't commonly exploited yet).

### SSL certificates
Most of these html pages must be served over SSL. These files should work on local server; however, local network servers will have issues. Unless you're running the server off of the phone you'll have difficulties without an SSL certificate.

## Core Experiments

### Skeleton
Is a minimal boilerplate for building 3d webXR apps

### ArRecorder
Saves a txt file on phone of the cameras position + quaternion. This could be used to transform a real camera into a 3d camera. Also shows an animation example for recording.

### Depth
This experiments with fragment shaders and the Depth API.  It attempts to show off occlusion (although the results aren't that great). It is a good example of how to consume the api with threejs.

### Depth Mesh Capture
Grabbing a quick mesh of the location

### Depth Contour Maps
Converts the depth information into an image

### Camera Access
This works by dropping out of AR temporarily and taking a screen capture from a video and then restarting the AR session. Super hacky.

## Physics Experiments

### Many Bodies
Shows an N-body simulation in ar.

### Magnetometer
Shows the magnetometers recordings in augmented reality 

### ArRuler
Find the absolute distance between two points in free space. Can be used as a ruler through walls. error is somewhere between 1-10% (so not great).

### Hydrogen Atom
This uses a worker for the heavy computation and hows hydrogen atom. 

### Ammo Physics (bullet engine)
Uses the bullet engine in combination with the depth api

### Magnetic Dipole Finder
Uses dipoles to estimate large metal objects

### Doppler Effect
This uses shaders to alter the light with the users speed to simulation the relativitic doppler effect.

## Experiments requiring a server
A few of these examples requires a server for computing. These do not have live examples. Generally django was used but any server with a strong ML/Math libraries.

### Pytorch 
Find depth with pytorch

### Liquid
Navier Stokes that interact with potential

### Potential
Turning depth information into a grid in AR

## Other Experiments

### Grain Elevator
An photogrammetry experiment. Using photos to create a mesh then placing it back into AR.

### Regina
Uses google's GIS data to build a subsection of regina in AR

## Goal Experiments
 
### TODO
clean code.

magnetism + mass + qm + relativity
