# 3D Interactive Demos

A collection of interactive Three.js demos for web browsers.

**View the project on GitHub: [https://github.com/git-michael-hub/3d](https://github.com/git-michael-hub/3d)**

## Quick Navigation
- [Wave Effect (index.html)](#wave-effect)
- [Particle Effect (particle-animation.html)](#particle-effect)
- [3D Image Gallery (image-gallery.html)](#3d-image-gallery)
- [3D Sports Car (3d-sportscar.html)](#3d-sports-car)
- [3D Jeep (3d-jeep.html)](#3d-jeep)
- [Keyframe Animation (keyframe-animation.html)](#keyframe-animation)
- [Project 3 Animation (project3-animation.html)](#project-3-animation)
- [Tokyo Animation (tokyo-animation.html)](#tokyo-animation)
- [Philippines Animation (philippines-animation.html)](#philippines-animation)
- [3D Tiles Loader (3d-tiles-loader.html)](#3d-tiles-loader)
- [Car Materials (car-materials.html)](#car-materials)
- [Lava Shader (lava-shader.html)](#lava-shader)

## Live Demo Links
When the server is running at http://localhost:3000, you can access the demos with these links:

1. [🌊 Wave Effect](http://localhost:3000/index.html)
2. [✨ Particle Effect](http://localhost:3000/particle-animation.html)
3. [🖼️ 3D Image Gallery](http://localhost:3000/image-gallery.html)
4. [🏎️ 3D Sports Car](http://localhost:3000/3d-sportscar.html)
5. [🚙 3D Jeep](http://localhost:3000/3d-jeep.html)
6. [🎬 Keyframe Animation](http://localhost:3000/keyframe-animation.html)
7. [🌟 Project 3 Animation](http://localhost:3000/project3-animation.html)
8. [🗼 Tokyo Animation](http://localhost:3000/tokyo-animation.html)
9. [🇵🇭 Philippines Animation](http://localhost:3000/philippines-animation.html)
10. [🗺️ 3D Tiles Loader](http://localhost:3000/3d-tiles-loader.html)
11. [🚗 Car Materials](http://localhost:3000/car-materials.html)
12. [🌋 Lava Shader](http://localhost:3000/lava-shader.html)

## Available Demos

1. 🌊 <span id="wave-effect">**Wave Effect**</span> - Interactive wave animation effect (index.html)
2. ✨ <span id="particle-effect">**Particle Effect**</span> - Dynamic particle system animation (particle-animation.html)
3. 🖼️ <span id="3d-image-gallery">**3D Image Gallery**</span> - Interactive 3D gallery for images (image-gallery.html)
4. 🏎️ <span id="3d-sports-car">**3D Sports Car**</span> - Interactive 3D sports car model viewer (3d-sportscar.html)
5. 🚙 <span id="3d-jeep">**3D Jeep**</span> - Interactive 3D jeep model viewer (3d-jeep.html)
6. 🎬 <span id="keyframe-animation">**Keyframe Animation**</span> - Animation example using keyframes (keyframe-animation.html)
7. 🌟 <span id="project-3-animation">**Project 3 Animation**</span> - Custom animation showcase (project3-animation.html)
8. 🗼 <span id="tokyo-animation">**Tokyo Animation**</span> - Tokyo-themed animation (tokyo-animation.html)
9. 🇵🇭 <span id="philippines-animation">**Philippines Animation**</span> - Philippines-themed animation (philippines-animation.html)
10. 🗺️ <span id="3d-tiles-loader">**3D Tiles Loader**</span> - 3D geographic tiles visualization (3d-tiles-loader.html)
11. 🚗 <span id="car-materials">**Car Materials**</span> - Ferrari car with customizable materials (car-materials.html)
12. 🌋 <span id="lava-shader">**Lava Shader**</span> - Interactive lava shader with multiple modes (lava-shader.html)
    - Features standard, crystal, and moon turbulence modes
    - Multiple themes: Lava, Toxic, Ocean, Moon, Inferno, Electric, Emerald, Sunset, Desert, Arctic
    - Various 3D geometries to apply the shader to
    - Customizable parameters for the shader effects

## Getting Started

### Prerequisites

- Node.js installed on your system

### Installation

1. Clone this repository
2. Install dependencies:
```
npm install
```

### Running the Server

Start the local development server:
```
node server.js
```

The server will start at `http://localhost:3000/`. You can access any of the demos by navigating to their respective URLs.

## Controls

Most demos feature interactive controls:
- Mouse drag to rotate
- Scroll to zoom
- Right-click drag to pan

The Lava Shader demo includes additional controls:
- Number keys 1-3 to change turbulence modes
- Press T to cycle through themes
- Number keys 4-0 to select specific themes
- R to reset camera view

## Adding Images

To add images for the Image Gallery demo, place them in the `images/` directory.

## Technologies

- Three.js
- JavaScript
- HTML5
- CSS3
- Node.js
