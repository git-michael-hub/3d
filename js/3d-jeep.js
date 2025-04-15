import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up 3D jeep scene...');

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
let scene, camera, renderer, controls, composer;
let jeep;
let envMap;
let loadingManager;
let lights = [];

// Initialize the scene
init();

async function init() {
    try {
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
        scene.background = new THREE.Color(0x000000);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(5, 3, 8);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        document.body.appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 3;
        controls.maxDistance = 20;
        controls.enablePan = false;
        controls.maxPolarAngle = Math.PI / 2;
        
        // Setup post-processing
        setupPostProcessing();
        
        // Create environment and lighting
        await setupEnvironment();
        setupLighting();
        
        // Add a ground plane
        createGround();
        
        // Create a temporary loading object
        createLoadingObject();
        
        // Load the 3D jeep model
        // Since we don't have an actual 3D model, we'll create a jeep-like object with primitives
        createJeepModel();
        
        // Handle keyboard events
        setupControls();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Start animation loop
        animate();
        
        console.log('Jeep scene setup complete');
    } catch (error) {
        console.error('Error setting up scene:', error);
        showError('Failed to set up the scene: ' + error.message);
    }
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.2,    // strength
        0.3,    // radius
        0.9     // threshold
    );
    composer.addPass(bloomPass);
}

async function setupEnvironment() {
    // Create an environment map (you can replace this with a real HDRI if available)
    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const cubeUrls = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // right
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // left
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // top
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // bottom
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // front
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='  // back
    ];
    
    // Here we're using a placeholder. In a real app, you'd use actual HDR images
    envMap = cubeTextureLoader.load(cubeUrls);
    scene.environment = envMap;
}

function setupLighting() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    lights.push(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    lights.push(directionalLight);
    
    // Add some fill lights for better illumination
    const colors = [0x0088ff, 0xff8800, 0xffffff];
    colors.forEach((color, i) => {
        const spotLight = new THREE.SpotLight(color, 0.3);
        const angle = (i / colors.length) * Math.PI * 2;
        spotLight.position.set(
            Math.cos(angle) * 15,
            5,
            Math.sin(angle) * 15
        );
        spotLight.castShadow = true;
        spotLight.angle = 0.3;
        spotLight.penumbra = 0.2;
        spotLight.decay = 2;
        spotLight.distance = 50;
        scene.add(spotLight);
        lights.push(spotLight);
    });
}

function createGround() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create a grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);
}

function createLoadingObject() {
    // Create a simple rotating cube to show while loading
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x00aaff,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x0044aa,
        emissiveIntensity: 0.5
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1;
    cube.castShadow = true;
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

function createJeepModel() {
    // Create a group to hold all jeep parts
    jeep = new THREE.Group();
    
    // Create materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2E5D34, // Military green
        roughness: 0.5,
        metalness: 0.2
    });
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88CCFF,
        transmission: 0.9,
        transparent: true,
        roughness: 0.1,
        metalness: 0
    });
    
    const tireMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        metalness: 0
    });
    
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.8
    });
    
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFCC,
        emissive: 0xFFFFCC,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.8
    });
    
    // Chassis
    const chassisGeometry = new THREE.BoxGeometry(4, 0.5, 2);
    const chassis = new THREE.Mesh(chassisGeometry, bodyMaterial);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    jeep.add(chassis);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(3, 0.8, 1.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.4;
    body.position.z = 0;
    body.castShadow = true;
    body.receiveShadow = true;
    jeep.add(body);
    
    // Hood
    const hoodGeometry = new THREE.BoxGeometry(1.5, 0.4, 1.8);
    const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
    hood.position.y = 1.2;
    hood.position.x = 1.25;
    hood.castShadow = true;
    hood.receiveShadow = true;
    jeep.add(hood);
    
    // Windshield
    const windshieldGeometry = new THREE.BoxGeometry(0.1, 0.8, 1.6);
    const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
    windshield.position.y = 1.8;
    windshield.position.x = 0.45;
    windshield.castShadow = true;
    jeep.add(windshield);
    
    // Top/Roof
    const roofGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.6);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 2.25;
    roof.position.x = -0.5;
    roof.castShadow = true;
    roof.receiveShadow = true;
    jeep.add(roof);
    
    // Back of jeep
    const backGeometry = new THREE.BoxGeometry(0.1, 0.8, 1.6);
    const back = new THREE.Mesh(backGeometry, bodyMaterial);
    back.position.y = 1.8;
    back.position.x = -1.45;
    back.castShadow = true;
    back.receiveShadow = true;
    jeep.add(back);
    
    // Headlights
    const createHeadlight = (x, z) => {
        const headlightGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
        const headlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        headlight.rotation.z = Math.PI / 2;
        headlight.position.set(x, 1.1, z);
        headlight.castShadow = true;
        
        // Add a point light to make the headlight emit light
        const headlightLight = new THREE.SpotLight(0xFFFFCC, 0.8);
        headlightLight.position.set(x, 1.1, z);
        headlightLight.target.position.set(x + 2, 1.1, z);
        headlightLight.angle = 0.3;
        headlightLight.castShadow = true;
        
        jeep.add(headlight);
        jeep.add(headlightLight);
        jeep.add(headlightLight.target);
        lights.push(headlightLight);
    };
    
    createHeadlight(2, 0.6);
    createHeadlight(2, -0.6);
    
    // Wheels
    const createWheel = (x, z) => {
        // Tire
        const tireGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(x, 0.4, z);
        tire.castShadow = true;
        tire.receiveShadow = true;
        
        // Wheel rim
        const rimGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.31, 16);
        const rim = new THREE.Mesh(rimGeometry, wheelMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(x, 0.4, z);
        rim.castShadow = true;
        
        // Spokes
        for (let i = 0; i < 5; i++) {
            const spokeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.31);
            const spoke = new THREE.Mesh(spokeGeometry, wheelMaterial);
            const angle = (i / 5) * Math.PI * 2;
            spoke.position.x = x + Math.cos(angle) * 0.15;
            spoke.position.y = 0.4 + Math.sin(angle) * 0.15;
            spoke.position.z = z;
            spoke.rotation.x = Math.PI / 2;
            spoke.rotation.z = angle;
            spoke.castShadow = true;
            jeep.add(spoke);
        }
        
        jeep.add(tire);
        jeep.add(rim);
    };
    
    // Add wheels at the four corners
    createWheel(1.5, 1.1);  // Front right
    createWheel(1.5, -1.1); // Front left
    createWheel(-1.5, 1.1); // Back right
    createWheel(-1.5, -1.1); // Back left
    
    // Seats
    const createSeat = (x, z) => {
        const seatGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.6);
        const seat = new THREE.Mesh(seatGeometry, bodyMaterial);
        seat.position.set(x, 1.0, z);
        seat.castShadow = true;
        seat.receiveShadow = true;
        
        // Seat back
        const backGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.6);
        const seatBack = new THREE.Mesh(backGeometry, bodyMaterial);
        seatBack.position.set(x - 0.25, 1.25, z);
        seatBack.castShadow = true;
        seatBack.receiveShadow = true;
        
        jeep.add(seat);
        jeep.add(seatBack);
    };
    
    // Add seats
    createSeat(0, 0.5);  // Driver
    createSeat(0, -0.5); // Passenger
    
    // Steering wheel
    const steeringWheelGeometry = new THREE.TorusGeometry(0.2, 0.03, 16, 32);
    const steeringWheel = new THREE.Mesh(steeringWheelGeometry, bodyMaterial);
    steeringWheel.position.set(0.2, 1.4, 0.5);
    steeringWheel.rotation.y = Math.PI / 2;
    steeringWheel.castShadow = true;
    jeep.add(steeringWheel);
    
    // Bumpers
    const createBumper = (x) => {
        const bumperGeometry = new THREE.BoxGeometry(0.2, 0.2, 2.2);
        const bumper = new THREE.Mesh(bumperGeometry, wheelMaterial);
        bumper.position.set(x, 0.5, 0);
        bumper.castShadow = true;
        bumper.receiveShadow = true;
        jeep.add(bumper);
    };
    
    createBumper(2.1);  // Front bumper
    createBumper(-2.1); // Rear bumper
    
    // Add the jeep to the scene
    jeep.position.y = 0;
    scene.add(jeep);
    
    // Add animation for the jeep wheels rotation
    return jeep;
}

function setupControls() {
    // Keyboard events
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'Space':
                // Toggle auto-rotation
                controls.autoRotate = !controls.autoRotate;
                break;
            case 'KeyL':
                // Toggle headlights
                lights.forEach(light => {
                    if (light.type === 'SpotLight' && light.color.getHex() === 0xffffcc) {
                        light.visible = !light.visible;
                    }
                });
                break;
            case 'KeyR':
                // Reset camera position
                camera.position.set(5, 3, 8);
                camera.lookAt(0, 0, 0);
                break;
        }
    });
    
    // Add event listener for pointer move
    document.addEventListener('mousemove', onPointerMove);
}

function onPointerMove(event) {
    // If jeep is loaded, make it subtly follow the mouse cursor
    if (jeep) {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Create subtle movement
        jeep.rotation.y = THREE.MathUtils.lerp(
            jeep.rotation.y,
            mouseX * 0.2,
            0.02
        );
    }
}

function updateLoadingProgress(progress) {
    const loadingElement = document.getElementById('loading-progress');
    if (loadingElement) {
        loadingElement.textContent = `${progress}%`;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Animate the jeep
    if (jeep) {
        // Gentle floating movement
        jeep.position.y = Math.sin(Date.now() * 0.001) * 0.05;
    }
    
    // Render with post-processing
    composer.render();
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