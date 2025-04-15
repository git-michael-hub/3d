import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Global variables
let scene, camera, renderer, controls;
let mixer, clock, model;
let animations = [];
let activeAction, previousAction;
let animationsSelect;
let composer, bloomPass;
let isPlaying = true;
let loadingManager;
let lastCalledTime, fps;
let philippineFlag, sunAndStars;

// Initialize the scene
init();

// Main initialization function
function init() {
    // Initialize clock for animations
    clock = new THREE.Clock();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0038a8); // Philippine flag blue
    scene.fog = new THREE.Fog(0x0038a8, 10, 50);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(5, 2, 8);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.colorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.update();
    
    // Set up loading manager
    setupLoadingManager();
    
    // Set up post-processing
    setupPostProcessing();
    
    // Create lighting
    createLights();
    
    // Create Philippine flag elements
    createPhilippineElements();
    
    // Load environment
    loadEnvironment();
    
    // Load the model
    loadModel();
    
    // Setup UI
    setupUI();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    
    // Start FPS counter
    startFPSCounter();
    
    // Start animation loop
    animate();
}

// Set up loading manager
function setupLoadingManager() {
    loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
        document.getElementById('loading-progress').textContent = `${progress}%`;
    };
    
    loadingManager.onLoad = function() {
        document.getElementById('loading').classList.add('hidden');
    };
}

// Set up post-processing
function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.3,  // strength
        0.4,  // radius
        0.85  // threshold
    );
    composer.addPass(bloomPass);
}

// Create Philippine flag elements
function createPhilippineElements() {
    // Create flag group
    philippineFlag = new THREE.Group();
    
    // Create flag base
    const flagGeometry = new THREE.PlaneGeometry(4, 2);
    
    // Create materials for the blue and red portions
    const blueMaterial = new THREE.MeshStandardMaterial({
        color: 0x0038a8,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.8
    });
    
    const redMaterial = new THREE.MeshStandardMaterial({
        color: 0xce1126,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.8
    });
    
    // Create the flag with blue top and red bottom
    const bluePart = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 1),
        blueMaterial
    );
    bluePart.position.y = 0.5;
    
    const redPart = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 1),
        redMaterial
    );
    redPart.position.y = -0.5;
    
    philippineFlag.add(bluePart);
    philippineFlag.add(redPart);
    
    // Create the white triangle
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(-2, -1);
    triangleShape.lineTo(0, 0);
    triangleShape.lineTo(-2, 1);
    triangleShape.lineTo(-2, -1);
    
    const whiteTriangle = new THREE.Mesh(
        new THREE.ShapeGeometry(triangleShape),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.8
        })
    );
    
    philippineFlag.add(whiteTriangle);
    
    // Create sun and stars group
    sunAndStars = new THREE.Group();
    
    // Create sun
    const sunGeometry = new THREE.CircleGeometry(0.3, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
        color: 0xfcd116,
        emissive: 0xfcd116,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-1, 0, 0.01);
    
    // Add rays to the sun
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const rayLength = 0.2;
        
        const ray = new THREE.Mesh(
            new THREE.BoxGeometry(rayLength, 0.05, 0.01),
            sunMaterial
        );
        
        ray.position.set(
            -1 + Math.cos(angle) * 0.4,
            Math.sin(angle) * 0.4,
            0.01
        );
        ray.rotation.z = angle;
        sunAndStars.add(ray);
    }
    
    sunAndStars.add(sun);
    
    // Create stars
    const starGeometry = new THREE.CircleGeometry(0.08, 5);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xfcd116,
        emissive: 0xfcd116,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
    });
    
    // Positions for the three stars
    const starPositions = [
        new THREE.Vector3(-1.3, 0.6, 0.01), // top star
        new THREE.Vector3(-1.3, -0.6, 0.01), // bottom star
        new THREE.Vector3(-0.7, 0, 0.01)     // right star
    ];
    
    starPositions.forEach(position => {
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.copy(position);
        star.rotation.z = Math.PI / 10; // Rotate slightly for proper star orientation
        sunAndStars.add(star);
    });
    
    philippineFlag.add(sunAndStars);
    
    // Position the flag
    philippineFlag.position.set(0, 5, -8);
    philippineFlag.rotation.y = Math.PI;
    philippineFlag.scale.set(2, 2, 2);
    
    scene.add(philippineFlag);
}

// Create lights for the scene
function createLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
    scene.add(ambientLight);
    
    // Main directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 20;
    scene.add(dirLight);
    
    // Add colored lights representing the Philippine flag colors
    const blueLight = new THREE.PointLight(0x0038a8, 3, 10);
    blueLight.position.set(-5, 2, 3);
    scene.add(blueLight);
    
    const redLight = new THREE.PointLight(0xce1126, 3, 10);
    redLight.position.set(5, 1, 3);
    scene.add(redLight);
    
    const yellowLight = new THREE.PointLight(0xfcd116, 3, 8);
    yellowLight.position.set(0, 3, -5);
    scene.add(yellowLight);
}

// Load environment map
function loadEnvironment() {
    new RGBELoader(loadingManager)
        .load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            
            // Ground
            const groundGeometry = new THREE.CircleGeometry(20, 32);
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: 0x0e6b0e, // Green for Philippine tropics
                metalness: 0.1,
                roughness: 0.8,
                envMap: texture
            });
            
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.01;
            ground.receiveShadow = true;
            scene.add(ground);
            
            // Add some palm trees around the scene
            addPalmTrees();
            
            // Add some water (to represent the Philippine archipelago)
            addWater();
        });
}

// Add palm trees to the scene
function addPalmTrees() {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        roughness: 0.8,
        metalness: 0.2
    });
    
    const leafGeometry = new THREE.ConeGeometry(2, 3, 8);
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x2E8B57, // Green
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Create several palm trees around the scene
    const treePositions = [
        {x: 8, z: 8},
        {x: -8, z: 8},
        {x: 8, z: -8},
        {x: -8, z: -8},
        {x: 12, z: 0},
        {x: -12, z: 0},
        {x: 0, z: 12},
        {x: 0, z: -12}
    ];
    
    treePositions.forEach(pos => {
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(pos.x, 2, pos.z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        scene.add(trunk);
        
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.position.set(pos.x, 5, pos.z);
        leaves.castShadow = true;
        scene.add(leaves);
    });
}

// Add water to represent the Philippine archipelago
function addWater() {
    const waterGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x0066cc,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);
    
    // Animate water
    function animateWater() {
        const vertices = waterGeometry.attributes.position.array;
        const time = Date.now() * 0.0007;
        
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.sin(time + vertices[i] * 0.1) * 0.3;
        }
        
        waterGeometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(animateWater);
    }
    
    animateWater();
}

// Load the 3D model
function loadModel() {
    // Configure loaders
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);
    
    // Since we're using the same Littlest Tokyo model, we'll customize its colors
    // to match Philippine themes
    gltfLoader.load('https://threejs.org/examples/models/gltf/LittlestTokyo.glb', function(gltf) {
        model = gltf.scene;
        
        // Modify materials to add Philippine colors
        model.traverse(function(object) {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
                
                // Change some materials to Philippine flag colors
                if (object.material) {
                    // Check the color of the material and replace some with Philippine colors
                    if (object.material.color) {
                        const color = object.material.color.getHex();
                        
                        // Replace some colors with Philippine flag colors
                        // We're checking for color ranges and replacing them
                        const r = (color >> 16) & 255;
                        const g = (color >> 8) & 255;
                        const b = color & 255;
                        
                        // If predominantly red, change to Philippine red
                        if (r > 200 && g < 100 && b < 100) {
                            object.material.color.setHex(0xce1126); // Philippine flag red
                        }
                        // If predominantly blue, change to Philippine blue
                        else if (r < 100 && g < 100 && b > 200) {
                            object.material.color.setHex(0x0038a8); // Philippine flag blue
                        }
                        // If predominantly yellow or gold, change to Philippine yellow
                        else if (r > 200 && g > 200 && b < 100) {
                            object.material.color.setHex(0xfcd116); // Philippine flag yellow
                        }
                    }
                }
            }
        });
        
        // Scale and position the model
        model.scale.set(0.008, 0.008, 0.008);
        model.position.y = 0;
        scene.add(model);
        
        // Get animations
        animations = gltf.animations;
        
        // Create animation mixer
        mixer = new THREE.AnimationMixer(model);
        
        // Create the select element options
        createAnimationsSelect();
        
        // Play the first animation
        if (animations.length > 0) {
            activeAction = mixer.clipAction(animations[0]);
            activeAction.play();
        }
    });
}

// Set up UI elements
function setupUI() {
    animationsSelect = document.getElementById('animations');
    
    // Add change event listener to the select element
    animationsSelect.addEventListener('change', function() {
        const selectedIndex = parseInt(animationsSelect.value);
        playAnimation(selectedIndex);
    });
}

// Create animation selection dropdown
function createAnimationsSelect() {
    // Clear existing options
    while (animationsSelect.firstChild) {
        animationsSelect.removeChild(animationsSelect.firstChild);
    }
    
    // Add new options based on available animations with Filipino names
    const filipinoNames = [
        'Paglalakad', // Walking
        'Pagtakbo', // Running
        'Pag-ikot', // Rotating
        'Paglundag', // Jumping
        'Sayaw', // Dancing
        'Paglipad', // Flying
    ];
    
    animations.forEach((clip, index) => {
        const option = document.createElement('option');
        option.value = index;
        // Use Filipino name if available, otherwise use the original name
        option.text = index < filipinoNames.length ? filipinoNames[index] : clip.name;
        animationsSelect.appendChild(option);
    });
}

// Play selected animation
function playAnimation(index) {
    if (index >= 0 && index < animations.length) {
        previousAction = activeAction;
        activeAction = mixer.clipAction(animations[index]);
        
        // Don't do anything if this is already the active action
        if (previousAction !== activeAction) {
            // Crossfade to the new animation
            if (previousAction) {
                previousAction.fadeOut(0.5);
            }
            
            activeAction
                .reset()
                .setEffectiveTimeScale(1)
                .setEffectiveWeight(1)
                .fadeIn(0.5)
                .play();
        }
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Handle keyboard events
function onKeyDown(event) {
    switch (event.key) {
        case ' ':
            // Toggle animation
            isPlaying = !isPlaying;
            break;
        case 'r':
        case 'R':
            // Reset camera
            camera.position.set(5, 2, 8);
            controls.target.set(0, 0.5, 0);
            controls.update();
            break;
    }
}

// Start FPS counter
function startFPSCounter() {
    lastCalledTime = performance.now();
    fps = 0;
    
    // Update FPS display every 500ms
    setInterval(() => {
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
    }, 500);
}

// Calculate FPS
function calculateFPS() {
    if (!lastCalledTime) {
        lastCalledTime = performance.now();
        fps = 0;
        return;
    }
    
    const delta = (performance.now() - lastCalledTime) / 1000;
    lastCalledTime = performance.now();
    fps = Math.round(1 / delta);
}

// Animate the Philippine flag elements
function animatePhilippineElements(time) {
    if (philippineFlag) {
        // Make the flag wave
        philippineFlag.rotation.y = Math.PI + Math.sin(time * 0.5) * 0.1;
        
        // Make the sun and stars glow
        if (sunAndStars) {
            const glow = 0.5 + Math.sin(time * 2) * 0.2;
            sunAndStars.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = glow;
                }
            });
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    
    // Update controls
    controls.update();
    
    // Calculate FPS
    calculateFPS();
    
    // Animate Philippine elements
    animatePhilippineElements(time);
    
    // Update mixer
    if (mixer && isPlaying) {
        mixer.update(clock.getDelta());
    }
    
    // Render scene with post-processing
    composer.render();
} 