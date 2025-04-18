# 3D Solar System

A dynamic and interactive simulation of our solar system created using THREE.js.

## Features

### Standard Setup
* Scene, Camera, Renderer for 3D visualization
* Interactive controls for navigating the 3D space
* Efficient texture loading and management

### Postprocessing Effects
* BloomPass for the Sun's glow
* OutlinePass for highlighting planets on hover
* EffectComposer for managing all effects

### Star Background
* Realistic starry sky with thousands of stars
* Random positions and subtle color variations

### Interactive Controls
* Orbit around the solar system
* Zoom in/out to explore planets
* Click on planets to get detailed information

### Lighting
* Ambient light for general illumination
* Point light at the Sun to cast realistic shadows

### Detailed Planet Creation
* Accurate size scaling for better visualization
* Realistic textures and bump maps
* Special materials including clouds and atmospheres for Earth
* Moon systems for planets that have them

### Realistic Orbits and Rotations
* Planets and moons orbit and rotate correctly
* Proper scaled distances and speeds
* Accurate axial tilts

### Asteroid Belts
* Main asteroid belt between Mars and Jupiter
* Kuiper belt beyond Neptune

## How to Use

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/3d-solar-system.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

## Controls

- **Mouse Drag**: Rotate the view
- **Scroll**: Zoom in/out
- **Space**: Toggle auto-rotation
- **R**: Reset camera position
- **P**: Toggle planet labels
- **Click on a planet**: Show information and zoom in

## Texture Resources

This project requires texture files for all celestial bodies. You'll need to add these to the `assets/textures` directory. Recommended sources:

- [NASA Solar System Exploration](https://solarsystem.nasa.gov/resources/)
- [Solar System Scope Textures](https://www.solarsystemscope.com/textures/)
- [Planet Pixel Emporium](http://planetpixelemporium.com/planets.html)

## License

This project is licensed under the MIT License.

---

This project was created as a replication of the solar system simulation at https://w21030911.nuwebspace.co.uk/graphics/assessment/
