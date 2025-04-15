import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Global variables
let camera, scene, renderer, controls;
let car, carParts = {};
let envMap;
let clock, fpsCounter;
let lastTimestamp = 0;
let frameCount = 0;
let loadingElement;

// Initialize the scene
init();

// Setup animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    controls.update();
    
    if (car) {
        car.rotation.y += delta * 0.2;
    }
    
    updateFPS(delta);
    renderer.render(scene, camera);
}

// Initialize the scene
function init() {
    // Get DOM elements
    loadingElement = document.getElementById('loading');
    fpsCounter = document.getElementById('fps-counter');
    
    // Setup clock
    clock = new THREE.Clock();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(4.25, 1.4, -4.5);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    document.body.appendChild(renderer.domElement);
    
    // Add lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080808, 1.5);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 5, -5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    
    // Add a ground plane
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.7,
            metalness: 0,
            envMap: envMap
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 0.5, 0);
    controls.update();
    
    // Event listener for window resize
    window.addEventListener('resize', onWindowResize);
    
    // Load environment map
    new RGBELoader()
        .setPath('https://threejs.org/examples/textures/equirectangular/')
        .load('venice_sunset_1k.hdr', function(texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            envMap = texture;
            
            // Load the car model after the environment map is loaded
            loadCarModel();
        });
    
    // Setup material button controls
    setupMaterialControls();
    
    // Start animation loop
    animate();
}

// Load the Ferrari car model
function loadCarModel() {
    // Setup DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    // Setup GLTF loader
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    // Load the Ferrari model
    loader.load(
        'https://threejs.org/examples/models/gltf/ferrari.glb',
        function(gltf) {
            car = gltf.scene;
            
            // Traverse the car and setup materials
            car.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Store parts by material name for later access
                    const materialName = child.name.toLowerCase();
                    if (materialName.includes('body')) {
                        carParts.body = carParts.body || [];
                        carParts.body.push(child);
                        setupBodyMaterial(child);
                    } else if (materialName.includes('glass')) {
                        carParts.glass = carParts.glass || [];
                        carParts.glass.push(child);
                        setupGlassMaterial(child);
                    } else if (materialName.includes('carbon') || materialName.includes('fiber')) {
                        carParts.carbon = carParts.carbon || [];
                        carParts.carbon.push(child);
                        setupCarbonFiberMaterial(child);
                    } else if (materialName.includes('interior') || materialName.includes('seat')) {
                        carParts.interior = carParts.interior || [];
                        carParts.interior.push(child);
                        setupInteriorMaterial(child);
                    } else {
                        carParts.details = carParts.details || [];
                        carParts.details.push(child);
                        setupDetailsMaterial(child);
                    }
                }
            });
            
            // Position and scale the car
            car.position.y = 0.33;
            car.rotation.y = Math.PI / 8;
            car.scale.set(1, 1, 1);
            scene.add(car);
            
            // Hide loading screen
            loadingElement.classList.add('hidden');
        },
        function(xhr) {
            // Progress callback
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            document.getElementById('loading-text').textContent = 
                `Loading Ferrari Model: ${Math.round(percentComplete)}%`;
        },
        function(error) {
            // Error callback
            console.error('An error happened loading the model:', error);
            document.getElementById('loading-text').textContent = 
                'Error loading Ferrari model';
        }
    );
}

// Setup body material (red paint)
function setupBodyMaterial(mesh) {
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0xff2800,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.2,
        envMap: envMap
    });
}

// Setup glass material
function setupGlassMaterial(mesh) {
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        envMap: envMap,
        envMapIntensity: 1.5
    });
}

// Setup carbon fiber material
function setupCarbonFiberMaterial(mesh) {
    // Create carbon fiber texture
    const resolution = 256;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const context = canvas.getContext('2d');
    
    // Draw carbon fiber pattern
    context.fillStyle = '#111111';
    context.fillRect(0, 0, resolution, resolution);
    
    // Create the weave pattern
    context.lineWidth = 2;
    context.strokeStyle = '#222222';
    
    const gridSize = 16;
    const spacing = resolution / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = i * spacing;
            const y = j * spacing;
            
            // Draw the weave pattern
            context.beginPath();
            context.arc(x + spacing/2, y + spacing/2, spacing/3, 0, 2 * Math.PI);
            context.stroke();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.3,
        map: texture,
        envMap: envMap,
        clearcoat: 1.0,
        clearcoatRoughness: 0.2
    });
}

// Setup interior material
function setupInteriorMaterial(mesh) {
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0x141414,
        metalness: 0.2,
        roughness: 0.8,
        envMap: envMap
    });
}

// Setup details material (chrome, etc)
function setupDetailsMaterial(mesh) {
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.1,
        envMap: envMap
    });
}

// Setup material control buttons
function setupMaterialControls() {
    const buttons = document.querySelectorAll('.material-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const materialType = this.getAttribute('data-material');
            
            // Customize materials based on selection
            if (materialType === 'body') {
                customizeBodyMaterial();
            } else if (materialType === 'glass') {
                customizeGlassMaterial();
            } else if (materialType === 'carbon') {
                customizeCarbonFiberMaterial();
            } else if (materialType === 'interior') {
                customizeInteriorMaterial();
            } else if (materialType === 'details') {
                customizeDetailsMaterial();
            } else if (materialType === 'philippine-flag') {
                applyPhilippineFlagLivery();
            }
        });
    });
}

// Customize body material with color pickers
function customizeBodyMaterial() {
    if (!carParts.body) return;
    
    // In a real app, you'd have a color picker here
    // For this example, we'll just cycle through some Ferrari colors
    const ferrariColors = [
        0xff2800, // Rosso Corsa
        0xffff00, // Giallo Modena
        0x000000, // Nero
        0x2a77c7, // Blu Corsa
        0xffffff, // Bianco Avus
    ];
    
    const currentColor = carParts.body[0].material.color.getHex();
    const currentIndex = ferrariColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % ferrariColors.length;
    
    carParts.body.forEach(part => {
        part.material.color.setHex(ferrariColors[nextIndex]);
    });
}

// Customize glass material
function customizeGlassMaterial() {
    if (!carParts.glass) return;
    
    const glassTypes = [
        { transmission: 0.9, tint: 0xffffff }, // Clear
        { transmission: 0.7, tint: 0x88ccff }, // Blue tint
        { transmission: 0.7, tint: 0x333333 }, // Dark tint
        { transmission: 0.8, tint: 0xaa7700 }, // Gold tint
    ];
    
    const currentTint = carParts.glass[0].material.color.getHex();
    let currentIndex = 0;
    
    for (let i = 0; i < glassTypes.length; i++) {
        if (glassTypes[i].tint === currentTint) {
            currentIndex = i;
            break;
        }
    }
    
    const nextIndex = (currentIndex + 1) % glassTypes.length;
    
    carParts.glass.forEach(part => {
        part.material.color.setHex(glassTypes[nextIndex].tint);
        part.material.transmission = glassTypes[nextIndex].transmission;
    });
}

// Customize carbon fiber material
function customizeCarbonFiberMaterial() {
    if (!carParts.carbon) return;
    
    const carbonTypes = [
        { color: 0x222222, clearcoat: 1.0 }, // Standard
        { color: 0x222222, clearcoat: 0.0 }, // Matte
        { color: 0x0a0a0a, clearcoat: 1.0 }, // Dark glossy
        { color: 0x444444, clearcoat: 0.5 }, // Light matte
    ];
    
    const currentColor = carParts.carbon[0].material.color.getHex();
    const currentClearcoat = carParts.carbon[0].material.clearcoat;
    let currentIndex = 0;
    
    for (let i = 0; i < carbonTypes.length; i++) {
        if (carbonTypes[i].color === currentColor && 
            Math.abs(carbonTypes[i].clearcoat - currentClearcoat) < 0.1) {
            currentIndex = i;
            break;
        }
    }
    
    const nextIndex = (currentIndex + 1) % carbonTypes.length;
    
    carParts.carbon.forEach(part => {
        part.material.color.setHex(carbonTypes[nextIndex].color);
        part.material.clearcoat = carbonTypes[nextIndex].clearcoat;
    });
}

// Customize interior material
function customizeInteriorMaterial() {
    if (!carParts.interior) return;
    
    const interiorColors = [
        0x141414, // Black
        0x762c2c, // Red
        0x3c3c3c, // Gray
        0x4a3520, // Brown
    ];
    
    const currentColor = carParts.interior[0].material.color.getHex();
    const currentIndex = interiorColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % interiorColors.length;
    
    carParts.interior.forEach(part => {
        part.material.color.setHex(interiorColors[nextIndex]);
    });
}

// Customize details material
function customizeDetailsMaterial() {
    if (!carParts.details) return;
    
    const detailFinishes = [
        { color: 0xffffff, metalness: 0.9, roughness: 0.1 }, // Chrome
        { color: 0xc0c0c0, metalness: 0.9, roughness: 0.3 }, // Brushed aluminum
        { color: 0xffd700, metalness: 0.9, roughness: 0.1 }, // Gold
        { color: 0x111111, metalness: 0.9, roughness: 0.2 }, // Black chrome
    ];
    
    const currentColor = carParts.details[0].material.color.getHex();
    let currentIndex = 0;
    
    for (let i = 0; i < detailFinishes.length; i++) {
        if (detailFinishes[i].color === currentColor) {
            currentIndex = i;
            break;
        }
    }
    
    const nextIndex = (currentIndex + 1) % detailFinishes.length;
    
    carParts.details.forEach(part => {
        part.material.color.setHex(detailFinishes[nextIndex].color);
        part.material.metalness = detailFinishes[nextIndex].metalness;
        part.material.roughness = detailFinishes[nextIndex].roughness;
    });
}

// Apply Philippine flag livery to the car
function applyPhilippineFlagLivery() {
    if (!carParts.body || !car) return;
    
    // Philippine flag colors
    const blueColor = 0x0038A8;  // Royal blue
    const redColor = 0xCE1126;   // Red
    const whiteColor = 0xFFFFFF; // White
    const goldColor = 0xFCD116;  // Gold for sun and stars
    
    // Split the body parts into sections
    const bodyParts = carParts.body;
    
    // Create different materials for different parts
    bodyParts.forEach((part, index) => {
        if (index % 3 === 0) {
            // Blue sections
            part.material.color.setHex(blueColor);
            part.material.roughness = 0.4;
            part.material.metalness = 0.7;
        } else if (index % 3 === 1) {
            // Red sections
            part.material.color.setHex(redColor);
            part.material.roughness = 0.4;
            part.material.metalness = 0.7;
        } else {
            // White sections
            part.material.color.setHex(whiteColor);
            part.material.roughness = 0.4;
            part.material.metalness = 0.8;
        }
    });
    
    // Apply gold to detail parts if they exist
    if (carParts.details) {
        carParts.details.forEach(part => {
            part.material.color.setHex(goldColor);
            part.material.metalness = 0.9;
            part.material.roughness = 0.1;
        });
    }
    
    // Create a special texture for the hood or top part if we can identify it
    bodyParts.forEach(part => {
        const partName = part.name.toLowerCase();
        if (partName.includes('hood') || partName.includes('top') || partName.includes('roof')) {
            // Create a Philippine flag emblem texture for the hood
            const resolution = 512;
            const canvas = document.createElement('canvas');
            canvas.width = resolution;
            canvas.height = resolution;
            const ctx = canvas.getContext('2d');
            
            // Draw background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, resolution, resolution);
            
            // Draw blue triangle
            ctx.fillStyle = '#0038A8';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(resolution * 0.5, resolution * 0.5);
            ctx.lineTo(0, resolution);
            ctx.closePath();
            ctx.fill();
            
            // Draw red triangle
            ctx.fillStyle = '#CE1126';
            ctx.beginPath();
            ctx.moveTo(resolution, 0);
            ctx.lineTo(resolution * 0.5, resolution * 0.5);
            ctx.lineTo(resolution, resolution);
            ctx.closePath();
            ctx.fill();
            
            // Draw sun in the middle
            ctx.fillStyle = '#FCD116';
            ctx.beginPath();
            ctx.arc(resolution * 0.25, resolution * 0.5, resolution * 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw 8 rays from the sun
            ctx.strokeStyle = '#FCD116';
            ctx.lineWidth = resolution * 0.02;
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const innerRadius = resolution * 0.15;
                const outerRadius = resolution * 0.25;
                ctx.beginPath();
                ctx.moveTo(
                    resolution * 0.25 + Math.cos(angle) * innerRadius,
                    resolution * 0.5 + Math.sin(angle) * innerRadius
                );
                ctx.lineTo(
                    resolution * 0.25 + Math.cos(angle) * outerRadius,
                    resolution * 0.5 + Math.sin(angle) * outerRadius
                );
                ctx.stroke();
            }
            
            // Draw 3 stars
            const starRadius = resolution * 0.05;
            const starPositions = [
                { x: resolution * 0.15, y: resolution * 0.25 },
                { x: resolution * 0.15, y: resolution * 0.75 },
                { x: resolution * 0.45, y: resolution * 0.5 }
            ];
            
            starPositions.forEach(pos => {
                ctx.fillStyle = '#FCD116';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = i * Math.PI * 2 / 5 - Math.PI / 2;
                    const x = pos.x + Math.cos(angle) * starRadius;
                    const y = pos.y + Math.sin(angle) * starRadius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
            });
            
            const texture = new THREE.CanvasTexture(canvas);
            
            part.material = new THREE.MeshPhysicalMaterial({
                map: texture,
                metalness: 0.5,
                roughness: 0.5,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                envMap: envMap
            });
        }
    });
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update FPS counter
function updateFPS(delta) {
    frameCount++;
    lastTimestamp += delta;
    
    if (lastTimestamp >= 1) {
        const fps = Math.round(frameCount / lastTimestamp);
        fpsCounter.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastTimestamp = 0;
    }
} 