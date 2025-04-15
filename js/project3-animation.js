import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Global variables
let scene, camera, renderer, controls, mixer, clock, stats;
let model, animations = [];
let animationActions = [];
let activeAction, previousAction;
let composer, bloomPass;
let currentAnimation = 'Walking';
let animationSpeed = 1;
let isPlaying = true;
let loadingManager, fpsInterval, startTime, now, then, elapsed;
let lastCalledTime, fps;
let cameraViews = [
    { position: [2, 2, 5], lookAt: [0, 1, 0] },
    { position: [5, 1, 0], lookAt: [0, 1, 0] },
    { position: [0, 3, 5], lookAt: [0, 1, 0] },
    { position: [3, 2, 3], lookAt: [0, 1, 0] }
];
let currentViewIndex = 0;

// Initialize the scene
init();

// Main initialization function
function init() {
    // Create clock for animations
    clock = new THREE.Clock();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 50);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Set camera position
    setCameraView(currentViewIndex);
    
    // Set up loading manager
    setupLoadingManager();
    
    // Create post-processing effects
    setupPostProcessing();
    
    // Create lights
    createLights();
    
    // Create environment
    createEnvironment();
    
    // Load character model
    loadModel();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start FPS counter
    startFpsCounter();
    
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

// Set up post-processing effects
function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // strength
        0.4,  // radius
        0.85  // threshold
    );
    composer.addPass(bloomPass);
}

// Create lighting for the scene
function createLights() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 1);
    scene.add(ambientLight);
    
    // Add directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);
    
    // Add rim light
    const rimLight = new THREE.DirectionalLight(0x8080ff, 2);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);
    
    // Add point lights for atmosphere
    const colors = [0x5050ff, 0xff5050, 0x50ff50];
    for (let i = 0; i < 3; i++) {
        const light = new THREE.PointLight(colors[i], 1, 15);
        light.position.set(
            Math.sin(i * Math.PI * 2 / 3) * 8,
            2 + Math.random() * 3,
            Math.cos(i * Math.PI * 2 / 3) * 8
        );
        scene.add(light);
    }
}

// Create environment (floor, background)
function createEnvironment() {
    // Create floor
    const floorGeometry = new THREE.CircleGeometry(10, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x444466,
        metalness: 0.2,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    
    // Load environment map
    new RGBELoader(loadingManager)
        .load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            
            // Background sphere with environment texture
            const bgGeometry = new THREE.SphereGeometry(30, 32, 32);
            const bgMaterial = new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                opacity: 0.3,
                transparent: true,
                envMap: texture
            });
            const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
            scene.add(bgSphere);
        });
}

// Load character model
function loadModel() {
    const loader = new GLTFLoader(loadingManager);
    
    // Load model from Three.js examples
    loader.load('https://threejs.org/examples/models/gltf/Xbot.glb', function(gltf) {
        model = gltf.scene;
        model.traverse(function(object) {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
                object.material.envMapIntensity = 0.8;
            }
        });
        
        // Scale and position the model
        model.scale.set(1, 1, 1);
        model.position.y = 0;
        scene.add(model);
        
        // Get animations
        animations = gltf.animations;
        
        // Create mixer
        mixer = new THREE.AnimationMixer(model);
        
        // Create animation actions
        createAnimationActions();
        
        // Set initial animation
        setAnimation(currentAnimation);
    });
}

// Create animation actions from loaded animations
function createAnimationActions() {
    // Common animation names
    const animationNames = [
        'Idle', 'Walking', 'Running', 'Dance', 
        'Death', 'Jump', 'Yes', 'No', 'Wave', 'Punch'
    ];
    
    // Create a map of animation actions
    animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        animationActions[clip.name] = action;
    });
    
    // Update animation buttons
    const buttonsContainer = document.getElementById('animation-buttons');
    const buttons = buttonsContainer.querySelectorAll('.animation-button');
    
    buttons.forEach(button => {
        const animName = button.getAttribute('data-animation');
        if (!animationActions[animName]) {
            button.style.opacity = 0.5;
            button.style.cursor = 'not-allowed';
        }
    });
}

// Set current animation
function setAnimation(name) {
    // Check if animation exists
    if (!animationActions[name]) {
        console.warn(`Animation "${name}" not found.`);
        
        // Find first available animation
        const availableAnim = Object.keys(animationActions)[0];
        if (availableAnim) {
            name = availableAnim;
        } else {
            console.error('No animations available.');
            return;
        }
    }
    
    // Set previous action
    previousAction = activeAction;
    
    // Set new action
    activeAction = animationActions[name];
    currentAnimation = name;
    
    // Update animation info display
    updateAnimationInfo();
    
    // If no previous action, just play the new one
    if (!previousAction) {
        activeAction.play();
        return;
    }
    
    // Crossfade between animations
    previousAction.fadeOut(0.5);
    activeAction.reset().fadeIn(0.5).play();
}

// Update animation info display
function updateAnimationInfo() {
    // Set animation name
    document.getElementById('animation-name').textContent = currentAnimation;
    
    // Set animation description based on name
    let description = '';
    switch (currentAnimation) {
        case 'Idle':
            description = 'Standing still with subtle movements.';
            break;
        case 'Walking':
            description = 'Casual walking animation at normal pace.';
            break;
        case 'Running':
            description = 'Fast running animation with pumping arms.';
            break;
        case 'Dance':
            description = 'Rhythmic dance movements.';
            break;
        case 'Death':
            description = 'Character falls dramatically to the ground.';
            break;
        case 'Jump':
            description = 'Character jumps up into the air.';
            break;
        case 'Yes':
            description = 'Nodding head in agreement.';
            break;
        case 'No':
            description = 'Shaking head in disagreement.';
            break;
        case 'Wave':
            description = 'Friendly waving gesture.';
            break;
        case 'Punch':
            description = 'Powerful punching motion.';
            break;
        default:
            description = 'Custom animation sequence.';
    }
    document.getElementById('animation-description').textContent = description;
    
    // Update animation buttons to show active animation
    const buttons = document.querySelectorAll('.animation-button');
    buttons.forEach(button => {
        if (button.getAttribute('data-animation') === currentAnimation) {
            button.style.backgroundColor = 'rgba(100, 100, 255, 0.5)';
            button.style.boxShadow = '0 0 15px rgba(100, 100, 255, 0.7)';
        } else {
            button.style.backgroundColor = 'rgba(80, 80, 255, 0.2)';
            button.style.boxShadow = 'none';
        }
    });
}

// Set camera view from predefined positions
function setCameraView(index) {
    if (index >= 0 && index < cameraViews.length) {
        const view = cameraViews[index];
        camera.position.set(...view.position);
        camera.lookAt(new THREE.Vector3(...view.lookAt));
        
        // Only set controls target if controls exist
        if (controls) {
            controls.target.set(...view.lookAt);
            controls.update();
        }
    }
}

// Toggle animation play/pause
function toggleAnimation() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        clock.start();
    } else {
        clock.stop();
    }
}

// Change animation speed
function changeAnimationSpeed(delta) {
    animationSpeed += delta;
    animationSpeed = Math.max(0.1, Math.min(2, animationSpeed));
    
    if (mixer) {
        mixer.timeScale = animationSpeed;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Keyboard controls
    window.addEventListener('keydown', onKeyDown);
    
    // Animation buttons
    const buttons = document.querySelectorAll('.animation-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const animName = button.getAttribute('data-animation');
            if (animationActions[animName]) {
                setAnimation(animName);
            }
        });
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Handle keyboard input
function onKeyDown(event) {
    switch (event.key) {
        case ' ':
            // Space - toggle animation
            toggleAnimation();
            break;
        case 'r':
        case 'R':
            // R - reset camera position
            setCameraView(0);
            break;
        case 'c':
        case 'C':
            // C - cycle camera views
            currentViewIndex = (currentViewIndex + 1) % cameraViews.length;
            setCameraView(currentViewIndex);
            break;
        case '+':
        case '=':
            // + - increase animation speed
            changeAnimationSpeed(0.1);
            break;
        case '-':
        case '_':
            // - - decrease animation speed
            changeAnimationSpeed(-0.1);
            break;
        default:
            // Number keys 1-0 for animations
            const num = parseInt(event.key);
            if (!isNaN(num) && num >= 1 && num <= 10) {
                const animIndex = num === 10 ? 9 : num - 1;
                const animKeys = Object.keys(animationActions);
                if (animIndex < animKeys.length) {
                    setAnimation(animKeys[animIndex]);
                }
            }
            break;
    }
}

// Start FPS counter
function startFpsCounter() {
    // Initialize time tracking for FPS calculation
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
    
    // Update animation mixer
    if (mixer && isPlaying) {
        mixer.update(clock.getDelta());
    }
    
    // Render scene with post-processing
    composer.render();
} 