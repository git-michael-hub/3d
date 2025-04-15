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

// Initialize the scene
init();

// Main initialization function
function init() {
    // Initialize clock for animations
    clock = new THREE.Clock();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 10, 50);
    
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
        0.2,  // strength
        0.3,  // radius
        0.9   // threshold
    );
    composer.addPass(bloomPass);
}

// Create lights for the scene
function createLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);
    
    // Directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0.2, 1, 1);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    
    const d = 4;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 10;
    scene.add(dirLight);
    
    // Point lights for a more interesting lighting
    const pointLight1 = new THREE.PointLight(0x0099ff, 0.8, 10);
    pointLight1.position.set(1, 3, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff9900, 0.8, 10);
    pointLight2.position.set(-3, 1, -5);
    scene.add(pointLight2);
}

// Load environment map
function loadEnvironment() {
    new RGBELoader(loadingManager)
        .load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            
            // Ground
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.3,
                roughness: 0.8,
                envMap: texture
            });
            
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(40, 40),
                groundMaterial
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.01; // Offset slightly to prevent z-fighting
            ground.receiveShadow = true;
            scene.add(ground);
        });
}

// Load the 3D model
function loadModel() {
    // Configure loaders
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);
    
    // Load the model
    gltfLoader.load('https://threejs.org/examples/models/gltf/LittlestTokyo.glb', function(gltf) {
        model = gltf.scene;
        
        // Apply shadows to all meshes
        model.traverse(function(object) {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Scale and position the model
        model.scale.set(0.01, 0.01, 0.01);
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
    
    // Add new options based on available animations
    animations.forEach((clip, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = clip.name;
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Calculate FPS
    calculateFPS();
    
    // Update mixer
    if (mixer && isPlaying) {
        mixer.update(clock.getDelta());
    }
    
    // Render scene with post-processing
    composer.render();
} 