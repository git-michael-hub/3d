# Image Re-Animation with Three.js

This project demonstrates how to animate static images using Three.js with two different techniques:

1. **Wave/Distortion Effect** - Animates the image with wave-like distortions and color shifts
2. **Particle Effect** - Transforms the image into interactive 3D particles

## Getting Started

1. Add your image to the `images/` directory and name it `image.jpg` (or update the image path in the JavaScript files)
2. Run the local server:
   ```
   node server.js
   ```
3. Open one of the following URLs in your browser:
   - Wave Effect: http://localhost:3000/index.html
   - Particle Effect: http://localhost:3000/particle-animation.html

You can also open the HTML files directly in your browser, but some browsers block local file access for security reasons.

## Requirements

- A modern web browser with WebGL support
- Node.js (for running the local server)
- An image you want to animate

## How It Works

### Wave/Distortion Effect

This effect uses custom GLSL shaders to create dynamic distortions on an image texture. The main techniques used are:

- Vertex displacement for wave effects
- UV distortion for liquid-like movement
- Color shifting for visual enhancement
- Post-processing with bloom effects

### Particle Effect

This effect transforms the image into 3D particles with the following features:

- Converts image pixels to 3D particles
- Preserves original colors
- Creates 3D depth based on pixel brightness
- Animates particles with wave-like motion
- Allows interactive 3D rotation with OrbitControls

## Customization

You can customize the animations by modifying the JavaScript files:

- `js/main.js` - Controls the wave/distortion effect
- `js/particle-effect.js` - Controls the particle effect

Adjustable parameters include:
- Animation speed and intensity
- Wave frequency and amplitude
- Particle size and density
- Color effects and intensity

## Technology Used

- Three.js - 3D JavaScript library
- GLSL Shaders - For custom visual effects
- HTML5 Canvas - For image processing
- WebGL - For hardware-accelerated rendering # 3d
