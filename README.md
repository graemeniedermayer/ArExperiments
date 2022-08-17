# Augmented Reality Experiments
The goal is to have 52 mini augmented reality projects done by the end of 2022. Hopefully they can be used as a recipe book for larger projects.

### Youtube
This is a companion repo to the youtube channel https://www.youtube.com/channel/UC_EkMqKOm7Ej_g03Ryv0UZw/videos

## Demos

### Github pages
[All Demo](https://graemeniedermayer.github.io/ArExperiments/) 

#### Select Demos
[Photogrammetry](https://graemeniedermayer.github.io/ArExperiments/html/arGrainElevator.html)

[MagneticField](https://graemeniedermayer.github.io/ArExperiments/html/arMagneticField.html) (requires chrome flag)

[AR Occlusion](https://graemeniedermayer.github.io/ArExperiments/html/depthOcclusion.html) 

[Camera Access](https://graemeniedermayer.github.io/ArExperiments/html/cameraAccess.html) 

[Mesh Capture with Depth api](https://graemeniedermayer.github.io/ArExperiments/html/depthMesh.html) 

## Setup
The three tools used were predominately threejs, webxr, and django. Django was only used when a backend was necessary. Django channels was used for websocket and the projects that use websocket require a little extra backend work.

### Chrome
These will only work on chromium derived browsers. Even then only chrome is particularly reliable.

### Chrome Flags
Many of these experiments require chrome flags enabled specifically: Experimental Web Platform Features and Generic Sensor Extra Classes enabled. These introduce some security issues so try to only visit trusted sites while using these flags (although I believe they aren't commonly exploited yet).

### SSL certificates
Most of these html pages must be served over SSL. These files should work on local server; however, because you need to run these on mobile you usually need a simple server with SSL.

### Django projects
Many of the projects using django require a bit of extra work in setting up. I'm still looking into a cleaner method of sharing them.

