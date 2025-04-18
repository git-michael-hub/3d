import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up solar system...');

// FPS Counter
let frameCount = 0;
let fps = 0;
let lastTime = performance.now();

function updateFPS() {
    const now = performance.now();
    const delta = now - lastTime;
    if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = now;
        document.getElementById('fps-counter').textContent = `FPS: ${fps} | Speed: ${Math.round(timeScale * 10) / 10}x`;
    }
    frameCount++;
}

// Loading manager
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    document.getElementById('loading-progress').textContent = `${progress}%`;
};

loadingManager.onLoad = () => {
    hideLoadingScreen();
};

loadingManager.onError = (url) => {
    console.error('Error loading texture:', url);
    // Force complete loading after errors
    if (!loadingComplete) {
        setTimeout(hideLoadingScreen, 1000);
    }
};

// Force hide loading screen after a timeout regardless of texture loading
let loadingComplete = false;
function hideLoadingScreen() {
    if (!loadingComplete) {
        loadingComplete = true;
        document.getElementById('loading').classList.add('hidden');
        console.log('Loading complete or timed out');
    }
}

// Force loading to complete after 3 seconds even if textures fail
setTimeout(hideLoadingScreen, 3000);

// Trigger the loading manager completion if no assets are being loaded
setTimeout(() => {
    if (document.getElementById('loading').style.display !== 'none' && 
        !document.getElementById('loading').classList.contains('hidden')) {
        console.log('No assets being loaded, manually completing loading');
        hideLoadingScreen();
    }
}, 500);

// Scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 30, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.1;
controls.minDistance = 20;
controls.maxDistance = 500;

// Add a time scale factor for animation speed
let timeScale = 1.0;

// Add stars background
function createStars() {
    const geometry = new THREE.BufferGeometry();
    const count = 10000;
    
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
        // Random positions in a sphere
        const radius = THREE.MathUtils.randFloat(200, 2000);
        const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
        const phi = THREE.MathUtils.randFloat(0, Math.PI);
        
        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);
        
        // Random colors (mostly white but with some color variation)
        colors[i] = THREE.MathUtils.randFloat(0.8, 1.0);
        colors[i + 1] = THREE.MathUtils.randFloat(0.8, 1.0);
        colors[i + 2] = THREE.MathUtils.randFloat(0.8, 1.0);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

createStars();

// Lighting
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 2, 0, 1);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
scene.add(sunLight);

// Planet data with colors instead of textures
const planetData = [
    {
        name: 'Sun',
        radius: 12,
        color: 0xffdd00,
        position: { x: 0, y: 0, z: 0 },
        rotationSpeed: 0.001,
        orbitalSpeed: 0,
        orbitalRadius: 0,
        tilt: 0,
        glowColor: 0xffdd00,
        emissive: true,
        geometry: 'sphere',
        info: 'The Sun is the star at the center of the Solar System. It is a nearly perfect sphere of hot plasma, with internal convective motion that generates a magnetic field via a dynamo process.'
    },
    {
        name: 'Mercury',
        radius: 0.8,
        color: 0xaa9988,
        position: { x: 20, y: 0, z: 0 },
        rotationSpeed: 0.004,
        orbitalSpeed: 0.008,
        orbitalRadius: 20,
        tilt: 0.03,
        geometry: 'icosahedron',
        detail: 1,
        info: 'Mercury is the smallest and innermost planet in the Solar System. Its orbit around the Sun takes 87.97 Earth days, the shortest of all the planets.'
    },
    {
        name: 'Venus',
        radius: 2,
        color: 0xe39e1c,
        position: { x: 30, y: 0, z: 0 },
        rotationSpeed: 0.002,
        orbitalSpeed: 0.006,
        orbitalRadius: 30,
        tilt: 2.6,
        geometry: 'dodecahedron',
        detail: 1,
        info: 'Venus is the second planet from the Sun. It is named after the Roman goddess of love and beauty. As the second-brightest natural object in the night sky after the Moon, Venus can cast shadows and can be visible to the naked eye in broad daylight.'
    },
    {
        name: 'Earth',
        radius: 2.1,
        color: 0x2233dd,
        atmosphereColor: 0x88aaff,
        position: { x: 40, y: 0, z: 0 },
        rotationSpeed: 0.01,
        orbitalSpeed: 0.005,
        orbitalRadius: 40,
        tilt: 23.5 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 2,
        moons: [
            {
                name: 'Moon',
                radius: 0.5,
                color: 0xaaaaaa,
                position: { x: 4, y: 0, z: 0 },
                rotationSpeed: 0.01,
                orbitalSpeed: 0.03,
                orbitalRadius: 4,
                tilt: 0,
                geometry: 'sphere'
            }
        ],
        info: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life. According to radiometric dating estimation, Earth formed over 4.5 billion years ago.'
    },
    {
        name: 'Mars',
        radius: 1.3,
        color: 0xdd3300,
        position: { x: 55, y: 0, z: 0 },
        rotationSpeed: 0.009,
        orbitalSpeed: 0.004,
        orbitalRadius: 55,
        tilt: 25 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 1,
        moons: [
            {
                name: 'Phobos',
                radius: 0.2,
                color: 0x887766,
                position: { x: 2.5, y: 0, z: 0 },
                rotationSpeed: 0.01,
                orbitalSpeed: 0.05,
                orbitalRadius: 2.5,
                tilt: 0,
                geometry: 'tetrahedron'
            },
            {
                name: 'Deimos',
                radius: 0.1,
                color: 0x776655,
                position: { x: 3.5, y: 0, z: 0 },
                rotationSpeed: 0.01,
                orbitalSpeed: 0.03,
                orbitalRadius: 3.5,
                tilt: 0,
                geometry: 'octahedron'
            }
        ],
        info: 'Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System, being larger than only Mercury. In English, Mars carries the name of the Roman god of war.'
    },
    {
        name: 'Jupiter',
        radius: 6,
        color: 0xdd9966,
        position: { x: 75, y: 0, z: 0 },
        rotationSpeed: 0.02,
        orbitalSpeed: 0.002,
        orbitalRadius: 75,
        tilt: 3.1 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 2,
        info: 'Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets in the Solar System combined, but slightly less than one-thousandth the mass of the Sun.'
    },
    {
        name: 'Saturn',
        radius: 5,
        color: 0xddbb88,
        position: { x: 100, y: 0, z: 0 },
        rotationSpeed: 0.018,
        orbitalSpeed: 0.0018,
        orbitalRadius: 100,
        tilt: 26.7 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 2,
        rings: {
            innerRadius: 6.5,
            outerRadius: 12,
            color: 0xddcc99
        },
        info: 'Saturn is the sixth planet from the Sun and the second-largest in the Solar System, after Jupiter. It is a gas giant with an average radius of about nine times that of Earth. It only has one-eighth the average density of Earth; however, with its larger volume, Saturn is over 95 times more massive.'
    },
    {
        name: 'Uranus',
        radius: 3.5,
        color: 0x99ccdd,
        position: { x: 120, y: 0, z: 0 },
        rotationSpeed: 0.015,
        orbitalSpeed: 0.0012,
        orbitalRadius: 120,
        tilt: 97.8 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 1,
        rings: {
            innerRadius: 4.5,
            outerRadius: 7,
            color: 0xaaddee
        },
        info: 'Uranus is the seventh planet from the Sun. Its name is a reference to the Greek god of the sky, Uranus, who, according to Greek mythology, was the grandfather of Zeus and father of Cronus. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System.'
    },
    {
        name: 'Neptune',
        radius: 3.5,
        color: 0x3355dd,
        position: { x: 140, y: 0, z: 0 },
        rotationSpeed: 0.017,
        orbitalSpeed: 0.001,
        orbitalRadius: 140,
        tilt: 28.3 * (Math.PI / 180),
        geometry: 'sphere',
        detail: 1,
        info: 'Neptune is the eighth and farthest-known Solar planet from the Sun. In the Solar System, it is the fourth-largest planet by diameter, the third-most-massive planet, and the densest giant planet. It is 17 times the mass of Earth, slightly more massive than its near-twin Uranus.'
    },
    {
        name: 'Pluto',
        radius: 0.5,
        color: 0xaaaaaa,
        position: { x: 160, y: 0, z: 0 },
        rotationSpeed: 0.008,
        orbitalSpeed: 0.0008,
        orbitalRadius: 160,
        tilt: 57.5 * (Math.PI / 180),
        geometry: 'dodecahedron',
        detail: 0,
        info: 'Pluto is a dwarf planet in the Kuiper belt, a ring of bodies beyond the orbit of Neptune. It was the first and the largest Kuiper belt object to be discovered. After Pluto was discovered in 1930, it was declared to be the ninth planet from the Sun. Beginning in the 1990s, its status as a planet was questioned.'
    }
];

// Create planets and their orbits
const planets = [];
const planetMeshes = [];
const planetLabels = [];
let showLabels = false;

// Function to create a geometry based on type
function createGeometry(type, radius, detail = 0) {
    switch(type) {
        case 'sphere':
            return new THREE.SphereGeometry(radius, 32, 32);
        case 'box':
            return new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5);
        case 'icosahedron':
            return new THREE.IcosahedronGeometry(radius, detail);
        case 'octahedron':
            return new THREE.OctahedronGeometry(radius, detail);
        case 'dodecahedron':
            return new THREE.DodecahedronGeometry(radius, detail);
        case 'tetrahedron':
            return new THREE.TetrahedronGeometry(radius, detail);
        case 'torus':
            return new THREE.TorusGeometry(radius, radius * 0.4, 16, 32);
        default:
            return new THREE.SphereGeometry(radius, 32, 32);
    }
}

function createPlanet(data) {
    const planetGroup = new THREE.Group();
    planetGroup.userData = { name: data.name, info: data.info };
    
    // Create geometry based on type
    const geometry = createGeometry(data.geometry, data.radius, data.detail);
    
    let material;
    if (data.emissive) {
        material = new THREE.MeshBasicMaterial({
            color: data.color,
            emissive: data.glowColor,
            emissiveIntensity: 0.8
        });
    } else {
        material = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.7,
            metalness: 0.3
        });
    }
    
    const planet = new THREE.Mesh(geometry, material);
    planet.castShadow = true;
    planet.receiveShadow = true;
    
    // Apply tilt
    planet.rotation.x = data.tilt || 0;
    
    // Add planet to its group
    planetGroup.add(planet);
    
    // Add planet to global array
    planets.push({
        mesh: planet,
        group: planetGroup,
        data: data
    });
    
    planetMeshes.push(planet);
    
    // Add atmosphere for Earth
    if (data.atmosphereColor) {
        const atmosphereGeometry = new THREE.SphereGeometry(data.radius + 0.1, 32, 32);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: data.atmosphereColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        planetGroup.add(atmosphere);
    }
    
    // Add rings for planets with rings
    if (data.rings) {
        const ringsGeometry = new THREE.RingGeometry(data.rings.innerRadius, data.rings.outerRadius, 64);
        const ringsMaterial = new THREE.MeshBasicMaterial({
            color: data.rings.color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const rings = new THREE.Mesh(ringsGeometry, ringsMaterial);
        rings.rotation.x = Math.PI / 2;
        planetGroup.add(rings);
    }
    
    // Add planet's moons
    if (data.moons) {
        data.moons.forEach(moonData => {
            const moonGroup = new THREE.Group();
            
            const moonGeometry = createGeometry(moonData.geometry, moonData.radius);
            const moonMaterial = new THREE.MeshStandardMaterial({
                color: moonData.color,
                roughness: 0.8,
                metalness: 0.1
            });
            
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            moon.castShadow = true;
            moon.receiveShadow = true;
            
            moonGroup.add(moon);
            moonGroup.position.set(moonData.position.x, moonData.position.y, moonData.position.z);
            
            // Store moon data
            moonGroup.userData = {
                orbitalSpeed: moonData.orbitalSpeed,
                rotationSpeed: moonData.rotationSpeed,
                orbitalRadius: moonData.orbitalRadius
            };
            
            planetGroup.add(moonGroup);
        });
    }
    
    // Create orbit line
    if (data.orbitalRadius > 0) {
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
        
        const vertices = [];
        const segments = 128;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                data.orbitalRadius * Math.cos(angle),
                0,
                data.orbitalRadius * Math.sin(angle)
            );
        }
        
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbit);
    }
    
    // Add text label
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const context = canvas.getContext('2d');
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(data.name, 100, 30);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8
    });
    
    const label = new THREE.Sprite(labelMaterial);
    label.position.set(0, data.radius + 2, 0);
    label.scale.set(10, 2, 1);
    label.visible = showLabels;
    
    planetGroup.add(label);
    planetLabels.push(label);
    
    // Position planet group at its starting position
    planetGroup.position.set(data.position.x, data.position.y, data.position.z);
    
    // Add to scene
    scene.add(planetGroup);
    
    return planetGroup;
}

// Create the asteroid belt
function createAsteroidBelt() {
    const asteroidCount = 1000;
    const asteroidGroup = new THREE.Group();
    
    const maxSize = 0.5;
    const minSize = 0.1;
    const innerRadius = 60;
    const outerRadius = 70;
    
    for (let i = 0; i < asteroidCount; i++) {
        // Random size
        const size = THREE.MathUtils.randFloat(minSize, maxSize);
        
        // Random position on orbit
        const angle = Math.random() * Math.PI * 2;
        const distance = THREE.MathUtils.randFloat(innerRadius, outerRadius);
        
        const x = distance * Math.cos(angle);
        const z = distance * Math.sin(angle);
        const y = THREE.MathUtils.randFloat(-1, 1) * 2;  // Some vertical variation
        
        // Create asteroid with random geometry
        const geometryType = Math.random() > 0.5 ? 'icosahedron' : 'octahedron';
        const geometry = createGeometry(geometryType, size, 0);
        
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.position.set(x, y, z);
        
        // Random rotation
        asteroid.rotation.x = Math.random() * Math.PI;
        asteroid.rotation.y = Math.random() * Math.PI;
        asteroid.rotation.z = Math.random() * Math.PI;
        
        asteroidGroup.add(asteroid);
    }
    
    scene.add(asteroidGroup);
    
    return asteroidGroup;
}

// Create Kuiper Belt (more distant asteroid belt beyond Neptune)
function createKuiperBelt() {
    const asteroidCount = 3000;
    const asteroidGroup = new THREE.Group();
    
    const maxSize = 0.7;
    const minSize = 0.2;
    const innerRadius = 150;
    const outerRadius = 180;
    
    for (let i = 0; i < asteroidCount; i++) {
        // Random size
        const size = THREE.MathUtils.randFloat(minSize, maxSize);
        
        // Random position on orbit
        const angle = Math.random() * Math.PI * 2;
        const distance = THREE.MathUtils.randFloat(innerRadius, outerRadius);
        
        const x = distance * Math.cos(angle);
        const z = distance * Math.sin(angle);
        const y = THREE.MathUtils.randFloat(-5, 5);  // More vertical variation
        
        // Create asteroid with random geometry
        const geometryTypes = ['tetrahedron', 'octahedron', 'icosahedron'];
        const randomType = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
        const geometry = createGeometry(randomType, size, 0);
        
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.position.set(x, y, z);
        
        // Random rotation
        asteroid.rotation.x = Math.random() * Math.PI;
        asteroid.rotation.y = Math.random() * Math.PI;
        asteroid.rotation.z = Math.random() * Math.PI;
        
        asteroidGroup.add(asteroid);
    }
    
    scene.add(asteroidGroup);
    
    return asteroidGroup;
}

// Create all planets
planetData.forEach(data => createPlanet(data));

// Create asteroid belts
const asteroidBelt = createAsteroidBelt();
const kuiperBelt = createKuiperBelt();

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom pass for sun glow
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,    // strength
    0.4,    // radius
    0.85    // threshold
);
composer.addPass(bloomPass);

// Outline pass for planet selection
const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
);
outlinePass.visibleEdgeColor.set('#ffffff');
outlinePass.hiddenEdgeColor.set('#190a05');
outlinePass.edgeThickness = 3;
outlinePass.edgeStrength = 5;
composer.addPass(outlinePass);

// Raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedPlanet = null;

// Event listeners
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetMeshes);
    
    if (intersects.length > 0) {
        // Found intersection - highlight the first intersected planet
        const planet = intersects[0].object;
        outlinePass.selectedObjects = [planet];
    } else {
        outlinePass.selectedObjects = [];
    }
});

document.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetMeshes);
    
    if (intersects.length > 0) {
        // Found intersection - show planet info
        const planet = intersects[0].object;
        
        // Find planet data
        const planetInfo = planets.find(p => p.mesh === planet);
        
        if (planetInfo) {
            selectedPlanet = planetInfo;
            
            // Show planet info panel
            const infoPanel = document.getElementById('planet-info');
            const planetName = document.getElementById('planet-name');
            const planetDescription = document.getElementById('planet-description');
            
            planetName.textContent = planetInfo.data.name;
            planetDescription.textContent = planetInfo.data.info;
            
            infoPanel.style.display = 'block';
            
            // Move camera to focus on the planet
            const distanceFactor = planetInfo.data.radius * 4 + 5;
            const newPosition = new THREE.Vector3(
                planetInfo.group.position.x + distanceFactor * 2,
                planetInfo.group.position.y + distanceFactor,
                planetInfo.group.position.z + distanceFactor
            );
            
            // Disable controls during transition
            controls.enabled = false;
            
            // Animate camera position
            const startPosition = camera.position.clone();
            const startTime = performance.now();
            const duration = 1500; // ms
            
            function animateCameraMove() {
                const now = performance.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease function (cubic ease-out)
                const t = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate position
                camera.position.lerpVectors(startPosition, newPosition, t);
                
                // Look at the planet
                controls.target.copy(planetInfo.group.position);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animateCameraMove);
                } else {
                    // Re-enable controls when done
                    controls.enabled = true;
                }
            }
            
            animateCameraMove();
        }
    }
});

// Close planet info panel
document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('planet-info').style.display = 'none';
    selectedPlanet = null;
    
    // Reset camera position to default
    const startPosition = camera.position.clone();
    const newPosition = new THREE.Vector3(0, 30, 100);
    const startTime = performance.now();
    const duration = 1500; // ms
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);
    
    // Disable controls during transition
    controls.enabled = false;
    
    function animateCameraReset() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function (cubic ease-out)
        const t = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position and target
        camera.position.lerpVectors(startPosition, newPosition, t);
        controls.target.lerpVectors(startTarget, endTarget, t);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCameraReset);
        } else {
            // Re-enable controls when done
            controls.enabled = true;
        }
    }
    
    animateCameraReset();
});

// Keyboard controls
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case ' ':
            // Toggle auto-rotation
            controls.autoRotate = !controls.autoRotate;
            break;
        case 'r':
        case 'R':
            // Reset camera position
            camera.position.set(0, 30, 100);
            controls.target.set(0, 0, 0);
            break;
        case 'p':
        case 'P':
            // Toggle planet labels
            showLabels = !showLabels;
            planetLabels.forEach(label => label.visible = showLabels);
            break;
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update FPS counter
    updateFPS();
    
    // Use rotation speed factor from rotation-control.js, fall back to timeScale if not available
    const rotationSpeed = window.rotationSpeedFactor !== undefined ? window.rotationSpeedFactor : timeScale;
    
    // Show rotation speed in FPS counter for debugging
    document.getElementById('fps-counter').textContent = `FPS: ${fps} | Speed: ${Math.round(rotationSpeed * 10) / 10}x`;
    
    // Animate planets
    planets.forEach(planet => {
        // Self-rotation stays at constant speed (not affected by rotation speed slider)
        planet.mesh.rotation.y += planet.data.rotationSpeed;
        
        // Orbit around the sun (if it's not the sun) - apply rotation speed here
        if (planet.data.orbitalRadius > 0) {
            const orbit = planet.data.orbitalSpeed;
            const radius = planet.data.orbitalRadius;
            
            // Apply rotation speed to orbital movement around the sun
            const angle = Date.now() * orbit * 0.0001 * rotationSpeed;
            planet.group.position.x = radius * Math.cos(angle);
            planet.group.position.z = radius * Math.sin(angle);
        }
        
        // Animate moons - moon orbits also use rotation speed
        if (planet.data.moons) {
            planet.group.children.forEach(child => {
                if (child.userData && child.userData.orbitalSpeed) {
                    // Self-rotation stays constant
                    child.rotation.y += child.userData.rotationSpeed;
                    
                    // Apply rotation speed to moon orbital movement
                    const angle = Date.now() * child.userData.orbitalSpeed * 0.001 * rotationSpeed;
                    const radius = child.userData.orbitalRadius;
                    child.position.x = radius * Math.cos(angle);
                    child.position.z = radius * Math.sin(angle);
                }
            });
        }
    });
    
    // Rotate asteroid belts - apply rotation speed
    asteroidBelt.rotation.y += 0.0001 * rotationSpeed;
    kuiperBelt.rotation.y += 0.00005 * rotationSpeed;
    
    // Render scene with post-processing
    composer.render();
}

animate(); 