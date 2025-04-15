import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up keyframe animation scene...');

// Custom WebGL detection function
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

// Check for WebGL support
if (!isWebGLAvailable()) {
    showError('WebGL is not available on your browser or device.');
    throw new Error('WebGL not available');
}

// Global variables
let scene, camera, renderer, controls;
let mixer, clock;
let loadingManager;
let model;
let isAnimating = true;
let currentCameraView = 'default';

// FPS counter variables
let fpsCounter;
let frameCount = 0;
let lastFpsUpdateTime = 0;

// Initialize the scene
init();

async function init() {
    try {
        // Initialize FPS counter
        fpsCounter = document.getElementById('fps-counter');
        
        // Create loading manager for tracking progress
        loadingManager = new THREE.LoadingManager();
        loadingManager.onProgress = function(url, loaded, total) {
            const progress = Math.round((loaded / total) * 100);
            updateLoadingProgress(progress);
        };
        
        loadingManager.onLoad = function() {
            document.getElementById('loading').classList.add('hidden');
        };
        
        loadingManager.onError = function(url) {
            showError(`Failed to load: ${url}`);
        };
        
        // Create scene
        scene = new THREE.Scene();
        
        // Initialize clock for animation
        clock = new THREE.Clock();
        
        // Create camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(2, 2, 5);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        document.body.appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 10;
        controls.target.set(0, 1, 0);
        
        // Create environment
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(environment).texture;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        
        // Create a temporary loading object
        createLoadingObject();
        
        // Load the model with keyframe animations
        await loadAnimatedModel();
        
        // Setup keyboard controls
        setupControls();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Start animation loop
        animate();
        
        console.log('Keyframe animation scene setup complete');
    } catch (error) {
        console.error('Error setting up scene:', error);
        showError('Failed to set up the scene: ' + error.message);
    }
}

function createLoadingObject() {
    // Create a simple rotating cube to show while loading
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x00aaff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x003366,
        emissiveIntensity: 0.5
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1;
    scene.add(cube);
    
    // Animation function for the loading cube
    function animateLoadingCube() {
        if (!cube.parent) return; // Stop if cube was removed
        
        requestAnimationFrame(animateLoadingCube);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.02;
        renderer.render(scene, camera);
    }
    
    // Start animation
    animateLoadingCube();
    
    // Remove the cube after loading completes
    loadingManager.onLoad = function() {
        scene.remove(cube);
        document.getElementById('loading').classList.add('hidden');
    };
}

async function loadAnimatedModel() {
    return new Promise((resolve, reject) => {
        // Create the GLTF loader
        const loader = new GLTFLoader(loadingManager);
        
        // Load the GLTF model with animations
        loader.load(
            'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
            (gltf) => {
                try {
                    model = gltf.scene;
                    
                    // Apply scale and position adjustments
                    model.scale.set(1, 1, 1);
                    model.position.set(0, 0, 0);
                    
                    // Add model to scene
                    scene.add(model);
                    
                    // Setup animation mixer
                    mixer = new THREE.AnimationMixer(model);
                    
                    // Get all animations from the model
                    const animations = gltf.animations;
                    console.log(`Loaded model with ${animations.length} animations`);
                    
                    // Play a default animation (Walking)
                    const walkingClip = THREE.AnimationClip.findByName(animations, 'Walking');
                    const walkingAction = mixer.clipAction(walkingClip);
                    walkingAction.play();
                    
                    // Store all animations for later use
                    model.animations = animations;
                    model.currentAnimation = 'Walking';
                    
                    resolve(model);
                } catch (error) {
                    reject(error);
                }
            },
            (xhr) => {
                // Loading progress handled by loading manager
            },
            (error) => {
                console.error('Error loading GLTF model:', error);
                reject(error);
            }
        );
    });
}

function setupControls() {
    // Keyboard events for animation control
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'Space':
                // Toggle animation
                isAnimating = !isAnimating;
                break;
            case 'KeyR':
                // Reset camera position
                camera.position.set(2, 2, 5);
                controls.target.set(0, 1, 0);
                break;
            case 'KeyC':
                // Change camera view
                changeCameraView();
                break;
            case 'Digit1':
                // Play Idle animation
                changeAnimation('Idle');
                break;
            case 'Digit2':
                // Play Walking animation
                changeAnimation('Walking');
                break;
            case 'Digit3':
                // Play Running animation
                changeAnimation('Running');
                break;
            case 'Digit4':
                // Play Dance animation
                changeAnimation('Dance');
                break;
            case 'Digit5':
                // Play Death animation
                changeAnimation('Death');
                break;
            case 'Digit6':
                // Play Jump animation
                changeAnimation('Jump');
                break;
            case 'Digit7':
                // Play Yes animation
                changeAnimation('Yes');
                break;
            case 'Digit8':
                // Play No animation
                changeAnimation('No');
                break;
            case 'Digit9':
                // Play Wave animation
                changeAnimation('Wave');
                break;
            case 'Digit0':
                // Play Punch animation
                changeAnimation('Punch');
                break;
        }
    });
}

function changeAnimation(animationName) {
    if (!model || !model.animations || !mixer) return;
    
    // Find animation clip by name
    const clip = THREE.AnimationClip.findByName(model.animations, animationName);
    if (!clip) {
        console.warn(`Animation "${animationName}" not found`);
        return;
    }
    
    // Stop all current animations
    mixer.stopAllAction();
    
    // Play the new animation
    const action = mixer.clipAction(clip);
    action.reset();
    action.play();
    
    // Store current animation name
    model.currentAnimation = animationName;
    console.log(`Playing "${animationName}" animation`);
}

function changeCameraView() {
    switch (currentCameraView) {
        case 'default':
            // Switch to front view
            camera.position.set(0, 1.5, 3);
            controls.target.set(0, 1, 0);
            currentCameraView = 'front';
            break;
        case 'front':
            // Switch to top view
            camera.position.set(0, 5, 0);
            controls.target.set(0, 0, 0);
            currentCameraView = 'top';
            break;
        case 'top':
            // Switch to side view
            camera.position.set(3, 1.5, 0);
            controls.target.set(0, 1, 0);
            currentCameraView = 'side';
            break;
        case 'side':
            // Switch back to default view
            camera.position.set(2, 2, 5);
            controls.target.set(0, 1, 0);
            currentCameraView = 'default';
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update FPS counter
    updateFpsCounter();
    
    // Update animation mixer if animation is enabled
    if (isAnimating && mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// FPS counter update
function updateFpsCounter() {
    frameCount++;
    const now = performance.now();
    
    // Update FPS display once per second
    if (now - lastFpsUpdateTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdateTime));
        fpsCounter.textContent = `FPS: ${fps}`;
        
        // Reset for next update
        frameCount = 0;
        lastFpsUpdateTime = now;
    }
}

function updateLoadingProgress(progress) {
    const loadingElement = document.getElementById('loading-progress');
    if (loadingElement) {
        loadingElement.textContent = `${progress}%`;
    }
}

function showError(message) {
    console.error(message);
    
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        const spinnerElement = loadingElement.querySelector('.spinner');
        if (spinnerElement) spinnerElement.remove();
        
        loadingElement.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">
            <h2>Error</h2>
            <p>${message}</p>
            <p>Check the browser console for more details.</p>
        </div>`;
    } else {
        alert(message);
    }
} 