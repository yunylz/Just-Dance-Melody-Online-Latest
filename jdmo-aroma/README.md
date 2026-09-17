# JDMO-Aroma
Based on [GiveMiiYouTube](https://github.com/PretendoNetwork/GiveMiiYouTube/tree/main).

This is an Aroma plugin for the Wii U Plugin System that patches the URLs inside Just Dance game executables, allowing them to connect to custom Just Dance Melody Online servers.

## Special Thanks to
[@ashquarky](https://github.com/ashquarky) for the patcher framework which was taken from [Nimble](https://github.com/PretendoNetwork/Nimble).

## Building
```bash
# Build docker image (only needed once)
docker build . -t jdmopatcher_builder

# make 
docker run -it --rm -v ${PWD}:/project jdmopatcher_builder make

# make clean
docker run -it --rm -v ${PWD}:/project jdmopatcher_builder make clean
```
