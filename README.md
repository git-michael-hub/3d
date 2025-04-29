# 3D Graphics Showcase

A collection of interactive 3D graphics projects built with Three.js, demonstrating various techniques and capabilities in WebGL rendering.

## Project Overview

This repository contains 12 different 3D visualization projects, each demonstrating different aspects of Three.js and WebGL capabilities. The projects range from a complete solar system simulation to specialized demonstrations of specific 3D techniques.

## Projects

### 1. Solar System Simulation (index.html)
The main project - a comprehensive solar system simulation featuring:
- All planets with accurate relative sizes, positions, and textures
- Realistic planetary orbits and rotations
- Interactive controls for exploration
- Planet information panels
- Asteroid belts
- Customizable rotation speed
- Detailed postprocessing effects (bloom, outline)

### 2. Lava Shader (lava-shader.html)
An advanced shader demonstration showing:
- Custom GLSL shaders for realistic lava effect
- Dynamic lighting and texture animation
- Heat distortion effects

### 3. Car Materials (car-materials.html)
A showcase of different material types for 3D vehicles:
- PBR (Physically Based Rendering) materials
- Metallic and roughness mapping
- Environmental reflections
- Various surface types (paint, chrome, glass, rubber)

### 4. 3D Tiles Loader (3d-tiles-loader.html)
Demonstrates loading and rendering of tiled 3D content:
- Efficient loading of large 3D datasets
- Level of detail management
- Optimized rendering techniques

### 5. Philippines Animation (philippines-animation.html)
Geographic visualization focusing on the Philippines:
- Topographical representation
- Custom camera paths
- Information overlays
- Animated elements

### 6. Tokyo Animation (tokyo-animation.html)
Urban visualization of Tokyo:
- Building models
- City layout
- Atmospheric effects
- Day/night transitions

### 7. Project 3 Animation (project3-animation.html)
Advanced animation techniques:
- Complex object transformations
- Animation sequencing
- Camera movement
- Custom timing functions

### 8. Keyframe Animation (keyframe-animation.html)
Demonstration of keyframe-based animation:
- Interpolation between key poses
- Animation timing control
- Multiple animation tracks
- Blending between animations

### 9. 3D Sports Car (3d-sportscar.html)
Interactive vehicle visualization:
- Detailed sports car model
- Interactive camera controls
- Realistic materials
- Optional animation sequences

### 10. 3D Jeep (3d-jeep.html)
Off-road vehicle visualization:
- Detailed jeep model
- Different viewing angles
- Component highlighting
- Simplified materials

### 11. Image Gallery (image-gallery.html)
3D presentation of image content:
- Interactive 3D gallery layout
- Transition effects
- Custom navigation controls
- Image loading optimization

### 12. Particle Animation (particle-animation.html)
Particle system demonstration:
- Thousands of interactive particles
- Physics-based movement
- Color transitions
- Mouse interaction

## Technology Stack

- **Three.js**: Core 3D library for WebGL rendering
- **JavaScript/ES6**: Core programming language
- **Node.js**: Simple server implementation
- **HTML5/CSS3**: Structure and styling

## How to Run

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/3d-graphics-showcase.git
   ```

2. Navigate to the project folder:
   ```
   cd 3d-graphics-showcase
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm start
   ```

5. Open your browser and go to:
   ```
   http://localhost:3000
   ```

6. Navigate to specific projects by opening their HTML files.

## Project Structure

- `/*.html`: Individual project pages
- `/js/*.js`: JavaScript files corresponding to each project
- `/assets/`: Textures and other resources
- `/images/`: Image assets used across projects
- `server.js`: Simple Node.js server for local development

## Browser Compatibility

These projects work best in modern browsers with WebGL support:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

This project is licensed under the MIT License.

## Acknowledgments

- Three.js community for documentation and examples
- Various texture and model resources used in these projects

## Live Demo

Visit the live demo at: [https://your-vercel-app-name.vercel.app](https://your-vercel-app-name.vercel.app)

## Features

### Lava Shader
- Interactive controls for flow speed, glow intensity, and turbulence
- Multiple geometric shapes and themes
- Advanced visual effects including bloom and post-processing
- Smooth camera controls with optimized zooming

### Solar System
- Accurate planetary positions and orbits
- Interactive camera with smooth controls
- Adjustable simulation speed
- Detailed planet information

## Development

### Local Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/3d-visualization.git
   cd 3d-visualization
   ```

2. Start a local server:
   - Using Node.js and `http-server`:
     ```
     npm install -g http-server
     http-server
     ```
   - Or Python:
     ```
     python -m http.server
     ```

3. Open your browser at `http://localhost:8080`

## Deployment

This project is configured for automatic deployment to Vercel through GitHub integration.

### Setup CI/CD

1. Sign up for a [Vercel account](https://vercel.com/signup)
2. Link your GitHub repository in the Vercel dashboard
3. Configure the following repository secrets in GitHub:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

### How it works

- Pushes to `main` branch trigger production deployments
- Pull requests generate preview deployments
- Status checks run automatically on each commit

## Technologies

- Three.js for 3D rendering
- WebGL shaders for visual effects
- Native JavaScript for UI and interactions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js community for examples and inspiration
- Shader inspiration from various WebGL demos
