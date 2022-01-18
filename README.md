# Augmented Reality Experiments
A set of experiments using augmented reality. These are web examples and need to be run off of a server. WebXR + Threejs are the predominate tools used.

# Caveats

## Chrome
These will only work on chromium derived browsers. Even then only chrome is particularly reliable.

## Chrome Flags
Many of these experiments require chrome flags enabled specifically: Experimental Web Platform Features and Generic Sensor Extra Classes enabled. These introduce some security issues so try to only visit trusted sites while using these flags (although I believe they aren't commonly exploited yet).

## SSL certificates
Most of these html pages must be served over SSL. These files should work on local server; however, local network servers will have issues. Unless you're running the server off of the phone you'll have difficulties without an SSL certificate.

# Experiments

## Skeleton
Is a minimal boilerplate for building 3d webXR apps

## Regina
Uses google's GIS data to build a subsection of regina in AR

## Many Bodies
Shows an N-body simulation in ar.

## Magnetometer
Shows the magnetometers recordings in augmented reality 

## Grain Elevator
An photogrammetry experiment. Using photos to create a mesh then placing it back into AR.

## ArRuler
Find the absolute distance between two points in free space. Can be used as a ruler through walls. error is somewhere between 1-10% (so not great).

## ArRecorder
Saves a txt file on phone of the cameras position + quaternion. This could be used to transform a real camera into a 3d camera. Also shows an animation example for recording.

# Goal Experiments
 
## TODO
