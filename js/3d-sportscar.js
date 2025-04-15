import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up 3D sports car scene...');

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
let car;
let envMap;
let loadingManager;
let lights = [];
let wheelMeshes = []; // For wheel rotation animation
let trafficCars = []; // For additional traffic cars
let trafficLights = []; // For traffic light objects
let isDriving = false;
let isTrafficLightGreen = true; // Traffic light state
let frustum = new THREE.Frustum(); // For frustum culling
let frustumMatrix = new THREE.Matrix4(); // For frustum culling
let lowPerformanceMode = false; // Flag for low performance mode

// FPS counter variables
let fpsCounter;
let frameCount = 0;
let lastFpsUpdateTime = 0;

// Performance settings
const SETTINGS = {
    shadowMapSize: 1024,    // Reduced from 2048
    trafficLightLOD: 12,    // Distance at which traffic lights are simplified
    trafficCarLOD: 50,      // Distance at which traffic cars are culled or simplified
    maxLights: 6,           // Maximum number of active lights
    bloomStrength: 0.2,     // Reduced bloom strength
    bloomRadius: 0.3,       // Reduced bloom radius
    shadowsEnabled: true    // Can be toggled for low-end devices
};

// Initialize the scene
init();

async function init() {
    try {
        // Initialize FPS counter
        fpsCounter = document.getElementById('fps-counter');
        
        // Check device performance and adjust settings
        checkDevicePerformance();
        
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
        camera.position.set(6, 10, 15); // Higher position to view the road
        
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
        controls.maxDistance = 50;
        controls.enablePan = false;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 0, 0);
        
        // Setup post-processing
        setupPostProcessing();
        
        // Create environment and lighting
        await setupEnvironment();
        setupLighting();
        
        // Add a road instead of a simple ground
        createRoad();
        
        // Create a temporary loading object
        createLoadingObject();
        
        // Create 3D sports car model for the player
        car = createSportsCar();
        car.position.set(0, 0, -2); // Position the main car in the right lane
        car.rotation.y = -Math.PI/2; // Rotate to face forward
        // Remove the car from the scene
        scene.remove(car);
        
        // Create traffic lights
        createTrafficLights();
        
        // Create additional cars for traffic
        createTrafficCars(10);
        
        // Start traffic light cycle
        startTrafficLightCycle();
        
        // Handle keyboard events
        setupControls();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Start animation loop with FPS tracking
        animate();
        
        console.log('Road with traffic scene setup complete');
    } catch (error) {
        console.error('Error setting up scene:', error);
        showError('Failed to set up the scene: ' + error.message);
    }
}

function checkDevicePerformance() {
    // Simple test to estimate device performance
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
    }
    const end = performance.now();
    const duration = end - start;
    
    // If the test took more than 50ms, consider it a low-performance device
    if (duration > 50) {
        lowPerformanceMode = true;
        
        // Adjust settings for low performance
        SETTINGS.shadowMapSize = 512;
        SETTINGS.trafficLightLOD = 8;
        SETTINGS.trafficCarLOD = 30;
        SETTINGS.maxLights = 3;
        SETTINGS.bloomStrength = 0.1;
        SETTINGS.bloomRadius = 0.2;
        SETTINGS.shadowsEnabled = false;
        
        console.log('Low performance mode enabled');
    }
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        SETTINGS.bloomStrength,     // Reduced strength 
        SETTINGS.bloomRadius,       // Reduced radius
        0.85                        // Threshold
    );
    
    // Apply reduced resolution for bloom pass on low-end devices
    if (lowPerformanceMode) {
        bloomPass.resolution = new THREE.Vector2(
            window.innerWidth * 0.5,
            window.innerHeight * 0.5
        );
    }
    
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Increased ambient light
    scene.add(ambientLight);
    lights.push(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = SETTINGS.shadowsEnabled;
    
    if (SETTINGS.shadowsEnabled) {
        directionalLight.shadow.mapSize.width = SETTINGS.shadowMapSize;
        directionalLight.shadow.mapSize.height = SETTINGS.shadowMapSize;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
    }
    
    scene.add(directionalLight);
    lights.push(directionalLight);
    
    // Add fewer fill lights for better performance
    const colors = lowPerformanceMode ? [0xffffff] : [0x0088ff, 0xff8800, 0xffffff];
    colors.forEach((color, i) => {
        const spotLight = new THREE.SpotLight(color, 0.4);
        const angle = (i / colors.length) * Math.PI * 2;
        spotLight.position.set(
            Math.cos(angle) * 15,
            5,
            Math.sin(angle) * 15
        );
        spotLight.castShadow = SETTINGS.shadowsEnabled;
        spotLight.angle = 0.3;
        spotLight.penumbra = 0.2;
        spotLight.decay = 2;
        spotLight.distance = 50;
        scene.add(spotLight);
        lights.push(spotLight);
    });
}

function createRoad() {
    // Create road surface
    const roadWidth = 12;
    const roadLength = 200; // Increased from 100 to 200
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.1;
    road.position.z = roadLength / 2 - 10; // Position road to extend forward
    road.receiveShadow = true;
    scene.add(road);
    
    // Add road markings - center line
    const centerLineGeometry = new THREE.PlaneGeometry(0.25, roadLength);
    const centerLineMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF
    });
    const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = -0.09;
    centerLine.position.z = roadLength / 2 - 10;
    scene.add(centerLine);
    
    // Add road markings - dashed lines
    const dashLength = 3;
    const dashGap = 3;
    const dashesPerLane = Math.floor((roadLength - dashGap) / (dashLength + dashGap));
    
    // Left lane divider
    for (let i = 0; i < dashesPerLane; i++) {
        const dashGeometry = new THREE.PlaneGeometry(0.25, dashLength);
        const dash = new THREE.Mesh(dashGeometry, centerLineMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.y = -0.09;
        dash.position.x = -roadWidth / 4;
        dash.position.z = (i * (dashLength + dashGap)) - roadLength / 2 + dashLength / 2 + 10;
        scene.add(dash);
    }
    
    // Right lane divider
    for (let i = 0; i < dashesPerLane; i++) {
        const dashGeometry = new THREE.PlaneGeometry(0.25, dashLength);
        const dash = new THREE.Mesh(dashGeometry, centerLineMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.y = -0.09;
        dash.position.x = roadWidth / 4;
        dash.position.z = (i * (dashLength + dashGap)) - roadLength / 2 + dashLength / 2 + 10;
        scene.add(dash);
    }
    
    // Add sidewalks
    const sidewalkWidth = 2;
    const sidewalkGeometry = new THREE.BoxGeometry(sidewalkWidth, 0.3, roadLength);
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.8
    });
    
    // Left sidewalk
    const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    leftSidewalk.position.x = -(roadWidth / 2 + sidewalkWidth / 2);
    leftSidewalk.position.y = 0.05;
    leftSidewalk.position.z = roadLength / 2 - 10;
    leftSidewalk.receiveShadow = true;
    scene.add(leftSidewalk);
    
    // Right sidewalk
    const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    rightSidewalk.position.x = roadWidth / 2 + sidewalkWidth / 2;
    rightSidewalk.position.y = 0.05;
    rightSidewalk.position.z = roadLength / 2 - 10;
    rightSidewalk.receiveShadow = true;
    scene.add(rightSidewalk);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(300, 300); // Increased ground size
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a8f3f, // Green for grass
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add buildings along the road
    createBuildings(roadWidth, roadLength, sidewalkWidth);
}

function createBuildings(roadWidth, roadLength, sidewalkWidth) {
    // Building properties
    const buildingColors = [
        0xaaaaaa, // Light gray
        0x999999, // Medium gray
        0x888888, // Gray
        0xb0c4de, // Light steel blue
        0xd3d3d3, // Light gray
        0xe6e6fa, // Lavender
        0xf5f5f5, // White smoke
        0xffa07a, // Light salmon
        0xffe4c4, // Bisque
        0xfffacd, // Lemon chiffon
        0xabcdef  // Light blue
    ];
    
    // Window properties
    const windowColor = 0x87CEFA; // Light blue for windows
    const windowMaterial = new THREE.MeshPhysicalMaterial({
        color: windowColor,
        metalness: 0.2,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        emissive: 0x555555,
        emissiveIntensity: 0.2,
    });
    
    // Create building facade material with emissive glow for windows at night
    const createBuildingMaterial = (color) => {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
    };
    
    // Building dimensions
    const minBuildingWidth = 5;
    const maxBuildingWidth = 10;
    const minBuildingDepth = 5;
    const maxBuildingDepth = 15;
    const minBuildingHeight = 3;
    const maxBuildingHeight = 12;
    const buildingSpacing = 2; // Gap between buildings
    
    // Position buildings along both sides of the road
    const leftSideX = -(roadWidth / 2 + sidewalkWidth + minBuildingWidth / 2 + 1);
    const rightSideX = roadWidth / 2 + sidewalkWidth + minBuildingWidth / 2 + 1;
    
    // Calculate the number of buildings that will fit along the road length
    const buildingPositionOffset = 20; // Offset from road start
    const roadSegmentLength = roadLength - buildingPositionOffset * 2;
    const avgBuildingSize = (minBuildingDepth + maxBuildingDepth) / 2 + buildingSpacing;
    const buildingsPerSide = Math.floor(roadSegmentLength / avgBuildingSize);
    
    // Create buildings on both sides
    for (let side = 0; side < 2; side++) {
        const sideX = side === 0 ? leftSideX : rightSideX;
        
        // Add a row of buildings along this side
        for (let i = 0; i < buildingsPerSide; i++) {
            // Randomize building properties
            const buildingWidth = minBuildingWidth + Math.random() * (maxBuildingWidth - minBuildingWidth);
            const buildingDepth = minBuildingDepth + Math.random() * (maxBuildingDepth - minBuildingDepth);
            const buildingHeight = minBuildingHeight + Math.random() * (maxBuildingHeight - minBuildingHeight);
            
            // Use a different color for each building
            const colorIndex = Math.floor(Math.random() * buildingColors.length);
            const buildingColor = buildingColors[colorIndex];
            const buildingMaterial = createBuildingMaterial(buildingColor);
            
            // Calculate building position along the road
            const buildingZ = -roadLength / 2 + buildingPositionOffset + i * (avgBuildingSize) + 10;
            
            // Create building group
            const buildingGroup = new THREE.Group();
            
            // Create the main building structure
            const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.y = buildingHeight / 2;
            
            // Add the main building to the group
            buildingGroup.add(building);
            
            // Add windows to the buildings
            const windowWidth = 0.8;
            const windowHeight = 1.0;
            const windowDepth = 0.1;
            const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
            
            // Determine which side of the building faces the road
            const facingDirection = side === 0 ? 1 : -1; // -1 for left side, 1 for right side
            
            // Create windows on the side facing the road
            const windowsPerWidth = Math.floor(buildingWidth / 1.5);
            const windowsPerHeight = Math.floor(buildingHeight / 1.5);
            
            for (let wx = 0; wx < windowsPerWidth; wx++) {
                for (let wy = 0; wy < windowsPerHeight; wy++) {
                    // Skip some windows randomly for variety
                    if (Math.random() > 0.7) continue;
                    
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    const x = (wx - (windowsPerWidth - 1) / 2) * 1.5;
                    const y = (wy * 1.5) + 1.0;
                    
                    // Position window on the side facing the road
                    if (facingDirection > 0) {
                        // Right side of road, put windows on left side of building
                        window.position.set(x, y, -buildingDepth / 2 - 0.05);
                    } else {
                        // Left side of road, put windows on right side of building
                        window.position.set(x, y, buildingDepth / 2 + 0.05);
                    }
                    
                    buildingGroup.add(window);
                }
            }
            
            // Add a simple roof (slightly bigger than the building)
            const roofGeometry = new THREE.BoxGeometry(buildingWidth + 0.5, 0.3, buildingDepth + 0.5);
            const roofMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333, // Dark gray
                roughness: 0.9
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = buildingHeight + 0.15;
            buildingGroup.add(roof);
            
            // Add some randomness to building position to make it look more natural
            const xOffset = (Math.random() - 0.5) * 3;
            const zOffset = (Math.random() - 0.5) * 3;
            
            // Position the building along the side of the road
            buildingGroup.position.set(sideX + xOffset * facingDirection, 0, buildingZ + zOffset);
            
            // Rotate the building slightly for variety
            buildingGroup.rotation.y = (Math.random() - 0.5) * 0.2;
            
            // Add the building group to the scene
            scene.add(buildingGroup);
        }
    }
}

function createLoadingObject() {
    // Create a simple rotating cube to show while loading
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x330000,
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

function createTrafficLights() {
    // Create enhanced traffic light materials with stronger emissive properties
    const postMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444, // Dark gray
        roughness: 0.7,
        metalness: 0.3
    });
    
    const houseMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111, // Nearly black
        roughness: 0.8,
        metalness: 0.2
    });
    
    const redLightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0x000000, // Will be changed when active
        roughness: 0.5,
        metalness: 0.8
    });
    
    const yellowLightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8800, // Changed to more orange color
        emissive: 0x000000, // Will be changed when active
        roughness: 0.5,
        metalness: 0.8
    });
    
    const greenLightMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00, // Start with green active
        roughness: 0.5,
        metalness: 0.8
    });
    
    // Store materials for reuse by other traffic light functions
    window.trafficLightMaterials = {
        post: postMaterial,
        housing: houseMaterial,
        red: redLightMaterial,
        yellow: yellowLightMaterial,
        green: greenLightMaterial
    };
    
    // Create traffic lights facing the direction of approaching vehicles
    createTrafficLight(6, 0, -Math.PI/2); // Right side of road, facing north (-Z direction)
    createTrafficLight(-6, 0, Math.PI/2); // Left side of road, facing south (+Z direction)
}

function createTrafficLight(x, z, rotation) {
    // Calculate distance from camera to light position for LOD
    const cameraDistance = Math.sqrt((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2);
    const isHighDetail = cameraDistance < SETTINGS.trafficLightLOD;
    
    // Use stored materials if available, otherwise create new ones
    const materials = window.trafficLightMaterials || {
        post: new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.3
        }),
        housing: new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        }),
        red: new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x000000,
            roughness: 0.5,
            metalness: 0.8
        }),
        yellow: new THREE.MeshStandardMaterial({
            color: 0xff8800,
            emissive: 0x000000,
            roughness: 0.5,
            metalness: 0.8
        }),
        green: new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            roughness: 0.5,
            metalness: 0.8
        })
    };
    
    const trafficLightGroup = new THREE.Group();
    
    // Post
    const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    const post = new THREE.Mesh(postGeometry, materials.post);
    post.position.y = 1.5;
    post.castShadow = true;
    trafficLightGroup.add(post);
    
    // Create a sub-group for the light housing and elements
    // This allows us to rotate the housing independently
    const lightHeadGroup = new THREE.Group();
    
    // Light housing - now a separate element that can be oriented
    const housingGeometry = new THREE.BoxGeometry(0.5, 1.2, 0.4);
    const housing = new THREE.Mesh(housingGeometry, materials.housing);
    housing.position.y = 1.5; // Position relative to the light head group
    housing.castShadow = true;
    lightHeadGroup.add(housing);
    
    // Light circles - positioned on the housing
    const lightGeometry = new THREE.CircleGeometry(0.1, 16);
    
    // Red light - positioned relative to the housing
    const redLight = new THREE.Mesh(lightGeometry, materials.red.clone());
    redLight.position.set(0, 1.9, 0.21);
    redLight.rotation.y = Math.PI; // Face forward
    lightHeadGroup.add(redLight);
    
    // Yellow light - positioned relative to the housing
    const yellowLight = new THREE.Mesh(lightGeometry, materials.yellow.clone());
    yellowLight.position.set(0, 1.5, 0.21);
    yellowLight.rotation.y = Math.PI; // Face forward
    lightHeadGroup.add(yellowLight);
    
    // Green light - positioned relative to the housing
    const greenLight = new THREE.Mesh(lightGeometry, materials.green.clone());
    greenLight.position.set(0, 1.1, 0.21);
    greenLight.rotation.y = Math.PI; // Face forward
    lightHeadGroup.add(greenLight);
    
    // Create light bulbs for better visibility
    const bulbGeometry = new THREE.SphereGeometry(0.09, 16, 16);
    
    // Red bulb - positioned relative to the housing
    const redBulb = new THREE.Mesh(bulbGeometry, materials.red.clone());
    redBulb.position.set(0, 1.9, 0.15);
    lightHeadGroup.add(redBulb);
    
    // Yellow bulb - positioned relative to the housing
    const yellowBulb = new THREE.Mesh(bulbGeometry, materials.yellow.clone());
    yellowBulb.position.set(0, 1.5, 0.15);
    lightHeadGroup.add(yellowBulb);
    
    // Green bulb - positioned relative to the housing
    const greenBulb = new THREE.Mesh(bulbGeometry, materials.green.clone());
    greenBulb.position.set(0, 1.1, 0.15);
    lightHeadGroup.add(greenBulb);
    
    // Position light head group at the top of the post
    lightHeadGroup.position.y = 1.5;
    
    // Add light head group to the main group
    trafficLightGroup.add(lightHeadGroup);
    
    // Create a traffic light object to store in the array
    let trafficLightObj;
    
    // Only add light sources if high detail and not in low performance mode
    if (isHighDetail && !lowPerformanceMode) {
        const createLightSource = (y, color) => {
            const pointLight = new THREE.PointLight(color, 0.5, 2); // Increased range
            pointLight.position.set(0, y, 0.3); // Moved forward to illuminate more
            return pointLight;
        };
        
        // Create light sources relative to the light head group
        const redLightSource = createLightSource(1.9, 0xff0000);
        const yellowLightSource = createLightSource(1.5, 0xff8800);
        const greenLightSource = createLightSource(1.1, 0x00ff00);
        
        // Only the green light is initially active
        redLightSource.intensity = 0;
        yellowLightSource.intensity = 0;
        greenLightSource.intensity = 1.0; // Increased intensity
        
        // Add light sources to the light head group
        lightHeadGroup.add(redLightSource);
        lightHeadGroup.add(yellowLightSource);
        lightHeadGroup.add(greenLightSource);
        
        // Store the lights for state changes
        trafficLightObj = {
            group: trafficLightGroup,
            lightHead: lightHeadGroup,
            redLight: redLight,
            yellowLight: yellowLight,
            greenLight: greenLight,
            redBulb: redBulb,
            yellowBulb: yellowBulb,
            greenBulb: greenBulb,
            redLightSource: redLightSource,
            yellowLightSource: yellowLightSource,
            greenLightSource: greenLightSource
        };
    } else {
        // Low detail version doesn't have actual light sources
        trafficLightObj = {
            group: trafficLightGroup,
            lightHead: lightHeadGroup,
            redLight: redLight,
            yellowLight: yellowLight,
            greenLight: greenLight,
            redBulb: redBulb,
            yellowBulb: yellowBulb,
            greenBulb: greenBulb
        };
    }
    
    trafficLights.push(trafficLightObj);
    
    // Position the main group
    trafficLightGroup.position.set(x, 0, z);
    
    // Rotate the main group based on position
    trafficLightGroup.rotation.y = rotation;
    
    // For right side traffic light, rotate head to face oncoming traffic
    if (x > 0) {
        // Make the light head perpendicular to the post
        lightHeadGroup.rotation.y = Math.PI/2;
    } else {
        // Left side traffic light should face the opposite direction
        lightHeadGroup.rotation.y = -Math.PI/2;
    }
    
    // Add to scene
    scene.add(trafficLightGroup);
    
    return trafficLightGroup;
}

function startTrafficLightCycle() {
    // Traffic light cycle with enhanced light effects
    function setLightState(state) {
        trafficLights.forEach(tl => {
            // Set emissive properties for light materials with stronger emission
            tl.redLight.material.emissive.setHex(state === 'red' ? 0xff0000 : 0x000000);
            tl.yellowLight.material.emissive.setHex(state === 'yellow' ? 0xff8800 : 0x000000);
            tl.greenLight.material.emissive.setHex(state === 'green' ? 0x00ff00 : 0x000000);
            
            // Set emissive for bulbs too for better visibility
            if (tl.redBulb) {
                tl.redBulb.material.emissive.setHex(state === 'red' ? 0xff0000 : 0x000000);
                tl.redBulb.material.emissiveIntensity = state === 'red' ? 2.0 : 0;
            }
            
            if (tl.yellowBulb) {
                tl.yellowBulb.material.emissive.setHex(state === 'yellow' ? 0xff8800 : 0x000000);
                tl.yellowBulb.material.emissiveIntensity = state === 'yellow' ? 2.0 : 0;
            }
            
            if (tl.greenBulb) {
                tl.greenBulb.material.emissive.setHex(state === 'green' ? 0x00ff00 : 0x000000);
                tl.greenBulb.material.emissiveIntensity = state === 'green' ? 2.0 : 0;
            }
            
            // Set intensity for point lights with stronger intensity
            if (tl.redLightSource) tl.redLightSource.intensity = state === 'red' ? 1.5 : 0;
            if (tl.yellowLightSource) tl.yellowLightSource.intensity = state === 'yellow' ? 1.5 : 0;
            if (tl.greenLightSource) tl.greenLightSource.intensity = state === 'green' ? 1.5 : 0;
        });
        
        isTrafficLightGreen = state === 'green';
        
        // Log the state change
        console.log(`Traffic light changed to ${state}`);
    }
    
    // Initial state is green
    setLightState('green');
    
    // Schedule the traffic light cycle
    setInterval(() => {
        setLightState('yellow');
        
        setTimeout(() => {
            setLightState('red');
            
            setTimeout(() => {
                setLightState('green');
            }, 5000); // Red duration
            
        }, 2000); // Yellow duration
        
    }, 15000); // Complete cycle duration
}

function createTrafficCars(numCars) {
    const carColors = [
        0x1a75ff, // Blue
        0x00cc44, // Green
        0xffcc00, // Yellow
        0xcc00cc, // Purple
        0xff6600, // Orange
        0x006666, // Teal
        0x663300, // Brown
        0x99ccff, // Light blue
        0x999999, // Silver
        0xffffff, // White
    ];
    
    // Create lanes
    const lanes = [
        { x: -3, z: -5, dir: 1, speed: 0.05 },  // Right lane, going forward
        { x: 3, z: 20, dir: -1, speed: 0.04 }   // Left lane, going backward
    ];
    
    // Distribute cars between lanes
    for (let i = 0; i < numCars; i++) {
        const lane = lanes[i % 2];
        const zOffset = (Math.floor(i / 2) * 15) * lane.dir; // Space cars evenly within each lane
        
        // Create a new car with a random color
        const trafficCar = createSportsCar(carColors[i % carColors.length]);
        
        // Position the car in its lane
        trafficCar.position.set(lane.x, 0, lane.z + zOffset);
        
        // Make front of car face direction of travel
        if (lane.dir > 0) {
            // Going forward in +Z direction, rotate -90 degrees to point front forward
            trafficCar.rotation.y = -Math.PI/2;
        } else {
            // Going backward in -Z direction, rotate 90 degrees to point front backward
            trafficCar.rotation.y = Math.PI/2;
        }
        
        // Store the car and its properties for animation
        trafficCars.push({
            car: trafficCar,
            lane: lane,
            speed: lane.speed * (0.8 + Math.random() * 0.4), // Vary speed slightly
            wheels: wheelMeshes.slice(-4) // Get the last 4 wheel objects added to wheelMeshes
        });
    }
    
    console.log(`Created ${trafficCars.length} traffic cars`);
}

function createSportsCar(carColor = 0xff0000) {
    const isPlayerCar = carColor === 0xff0000;
    const carGroup = new THREE.Group();
    
    // Create materials
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: carColor, // Using the parameter for car color
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
    
    const detailMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray
        metalness: 0.8,
        roughness: 0.2
    });
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transmission: 0.9,
        transparent: true,
        roughness: 0.1,
        metalness: 0
    });
    
    const tireMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0
    });
    
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd, // Chrome finish
        roughness: 0.1,
        metalness: 1.0
    });
    
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.8
    });
    
    const brakeLightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.8
    });
    
    // LOD for car details
    const detailLevel = isPlayerCar ? 'high' : (lowPerformanceMode ? 'low' : 'medium');
    
    // Reduced polygon counts for non-player cars
    const segmentCountMultiplier = detailLevel === 'high' ? 1 : (detailLevel === 'medium' ? 0.75 : 0.5);
    const wheelSegments = isPlayerCar ? 32 : 16;
    const bodySegments = isPlayerCar ? 8 : 4;
    
    // Chassis/Base
    const chassisGeometry = new THREE.BoxGeometry(5.0, 0.15, 2.2);
    const chassis = new THREE.Mesh(chassisGeometry, detailMaterial);
    chassis.position.y = 0.2;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    carGroup.add(chassis);
    
    // Main body (lower part) - wider and lower profile
    const lowerBodyGeometry = new THREE.BoxGeometry(4.6, 0.3, 2.0);
    const lowerBody = new THREE.Mesh(lowerBodyGeometry, bodyMaterial);
    lowerBody.position.y = 0.4;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    carGroup.add(lowerBody);
    
    // Create more refined body shape with curved top
    const createSleekBody = () => {
        // Main body shell - Formula 1/supercar style
        const segments = bodySegments;
        const bodyLength = 4.0;
        const maxWidth = 2.0;
        
        // Create main curved top
        for (let i = 0; i < segments; i++) {
            const xPos = i * (bodyLength / segments) - bodyLength/2 + 0.4; // Shift forward slightly
            
            // Calculate height for aerodynamic profile (lower at front, higher in middle, lower at back)
            let heightFactor;
            if (i < segments * 0.4) {
                // Front section (gradually rising)
                heightFactor = i / (segments * 0.4) * 0.8;
            } else if (i < segments * 0.7) {
                // Middle section (highest)
                heightFactor = 0.8 + (i - segments * 0.4) / (segments * 0.3) * 0.2;
            } else {
                // Rear section (gradually lowering)
                heightFactor = 1.0 - (i - segments * 0.7) / (segments * 0.3) * 0.4;
            }
            
            // Calculate width (wider in middle, narrower at ends)
            const widthFactor = 0.7 + 0.3 * Math.sin((i / segments) * Math.PI);
            
            // Apply height calculations
            const height = 0.1 + 0.9 * heightFactor;
            const width = maxWidth * widthFactor;
            
            // Create section of body
            const segmentGeometry = new THREE.BoxGeometry(bodyLength / segments + 0.05, height, width);
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.set(xPos, 0.6 + height/2, 0);
            segment.castShadow = true;
            segment.receiveShadow = true;
            carGroup.add(segment);
        }
        
        // Add side air intakes (Ferrari-style)
        const addSideIntakes = () => {
            const intakeGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.1);
            const intakeMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.9,
                metalness: 0.5
            });
            
            // Right side intake
            const rightIntake = new THREE.Mesh(intakeGeometry, intakeMaterial);
            rightIntake.position.set(0.3, 0.6, 1.0);
            rightIntake.castShadow = true;
            carGroup.add(rightIntake);
            
            // Left side intake
            const leftIntake = new THREE.Mesh(intakeGeometry, intakeMaterial);
            leftIntake.position.set(0.3, 0.6, -1.0);
            leftIntake.castShadow = true;
            carGroup.add(leftIntake);
        };
        
        // Add detailed front nose (F1 style)
        const createFrontNose = () => {
            // Main nose cone (pointed)
            const noseGeometry = new THREE.CylinderGeometry(0.1, 0.5, 1.0, 12, 1, false, 0, Math.PI);
            const noseCone = new THREE.Mesh(noseGeometry, bodyMaterial);
            noseCone.rotation.z = Math.PI / 2;
            noseCone.position.set(2.4, 0.5, 0);
            noseCone.castShadow = true;
            carGroup.add(noseCone);
            
            // Front splitter (aerodynamic element)
            const splitterGeometry = new THREE.BoxGeometry(0.8, 0.05, 1.8);
            const splitter = new THREE.Mesh(splitterGeometry, detailMaterial);
            splitter.position.set(2.3, 0.25, 0);
            splitter.castShadow = true;
            carGroup.add(splitter);
        };
        
        if (detailLevel !== 'low') {
            addSideIntakes();
            createFrontNose();
        }
    };
    
    createSleekBody();
    
    // Windshield - more angled and integrated
    const windshieldGeometry = new THREE.BoxGeometry(1.2, 0.6, 1.6);
    const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0.7, 1.1, 0);
    windshield.rotation.z = Math.PI * 0.12; // More aerodynamic angle
    windshield.castShadow = true;
    carGroup.add(windshield);
    
    // Add roof in cockpit style
    const roofGeometry = new THREE.BoxGeometry(1.0, 0.1, 1.2);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.set(-0.1, 1.35, 0);
    roof.castShadow = true;
    carGroup.add(roof);
    
    // Rear window - more integrated with the body
    const rearWindowGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.4);
    const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
    rearWindow.position.set(-0.8, 1.1, 0);
    rearWindow.rotation.z = -Math.PI * 0.15; 
    rearWindow.castShadow = true;
    carGroup.add(rearWindow);
    
    // Front hood with distinctive Ferrari-style shape
    const hoodGeometry = new THREE.BoxGeometry(1.2, 0.1, 1.7);
    const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
    hood.position.set(1.7, 0.7, 0);
    hood.castShadow = true;
    hood.receiveShadow = true;
    carGroup.add(hood);
    
    // Aerodynamic hood vents
    if (detailLevel !== 'low') {
        const ventGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.6);
        const hoodVent = new THREE.Mesh(ventGeometry, detailMaterial);
        hoodVent.position.set(1.7, 0.76, 0);
        hoodVent.castShadow = true;
        carGroup.add(hoodVent);
    }
    
    // Rear deck/engine cover
    const deckGeometry = new THREE.BoxGeometry(1.0, 0.1, 1.7);
    const deck = new THREE.Mesh(deckGeometry, bodyMaterial);
    deck.position.set(-1.7, 0.7, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    carGroup.add(deck);
    
    // Distinctive Ferrari-style rear with integrated spoiler
    const createRear = () => {
        // Main spoiler wing
        const spoilerWingGeometry = new THREE.BoxGeometry(0.5, 0.06, 1.9);
        const spoilerWing = new THREE.Mesh(spoilerWingGeometry, detailMaterial);
        spoilerWing.position.set(-2.1, 0.9, 0);
        spoilerWing.castShadow = true;
        spoilerWing.receiveShadow = true;
        carGroup.add(spoilerWing);
        
        // Spoiler supports - styled like Ferrari LaFerrari
        const supportWidth = 0.06;
        const supportHeight = 0.25;
        const supportGeometry = new THREE.BoxGeometry(supportWidth, supportHeight, 0.06);
        
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 0.7;
            const support = new THREE.Mesh(supportGeometry, detailMaterial);
            support.position.set(-2.0, 0.77, offset);
            support.castShadow = true;
            carGroup.add(support);
        }
        
        // Diffuser (aerodynamic element at rear)
        const diffuserGeometry = new THREE.BoxGeometry(0.3, 0.15, 1.6);
        const diffuser = new THREE.Mesh(diffuserGeometry, detailMaterial);
        diffuser.position.set(-2.25, 0.3, 0);
        diffuser.castShadow = true;
        carGroup.add(diffuser);
    };
    
    createRear();
    
    // Create distinctive headlights - inspired by Ferrari designs
    const createModernHeadlights = () => {
        // Main headlight housings
        const headlightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.6);
        
        // Right headlight (elongated)
        const rightHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        rightHeadlight.position.set(2.3, 0.6, 0.6);
        rightHeadlight.castShadow = true;
        carGroup.add(rightHeadlight);
        
        // Left headlight (elongated)
        const leftHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        leftHeadlight.position.set(2.3, 0.6, -0.6);
        leftHeadlight.castShadow = true;
        carGroup.add(leftHeadlight);
        
        // LED strips (optional detail for higher detail levels)
        if (detailLevel === 'high') {
            const ledGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.7);
            const rightLED = new THREE.Mesh(ledGeometry, lightMaterial.clone());
            rightLED.position.set(2.35, 0.7, 0.6);
            carGroup.add(rightLED);
            
            const leftLED = new THREE.Mesh(ledGeometry, lightMaterial.clone());
            leftLED.position.set(2.35, 0.7, -0.6);
            carGroup.add(leftLED);
        }
    };
    
    createModernHeadlights();
    
    // Only add lights to the player car to improve performance
    if (isPlayerCar && !lowPerformanceMode) {
        // Add a point light to make the headlight emit light
        const createHeadlightLight = (z) => {
            const headlightLight = new THREE.SpotLight(0xffffcc, 0.8);
            headlightLight.position.set(2.2, 0.6, z);
            headlightLight.target.position.set(4, 0.6, z);
            headlightLight.angle = 0.3;
            headlightLight.castShadow = true;
            
            carGroup.add(headlightLight);
            carGroup.add(headlightLight.target);
            lights.push(headlightLight);
        };
        
        createHeadlightLight(0.6);
        createHeadlightLight(-0.6);
    }
    
    // Create distinctive Ferrari-style taillights (horizontal bar)
    const createTaillights = () => {
        const taillightBarGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.6);
        const taillightBar = new THREE.Mesh(taillightBarGeometry, brakeLightMaterial);
        taillightBar.position.set(-2.25, 0.6, 0);
        taillightBar.castShadow = true;
        carGroup.add(taillightBar);
        
        // Add circular taillights for higher detail levels
        if (detailLevel !== 'low') {
            const rightTaillightGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
            const rightTaillight = new THREE.Mesh(rightTaillightGeometry, brakeLightMaterial);
            rightTaillight.rotation.z = Math.PI / 2;
            rightTaillight.position.set(-2.25, 0.7, 0.6);
            carGroup.add(rightTaillight);
            
            const leftTaillightGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
            const leftTaillight = new THREE.Mesh(leftTaillightGeometry, brakeLightMaterial);
            leftTaillight.rotation.z = Math.PI / 2;
            leftTaillight.position.set(-2.25, 0.7, -0.6);
            carGroup.add(leftTaillight);
        }
    };
    
    createTaillights();
    
    // Create larger wheels with distinctive Ferrari-style rims
    const createWheel = (x, z) => {
        // Tire - larger diameter
        const tireGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.25, wheelSegments);
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(x, 0.4, z);
        tire.castShadow = true;
        tire.receiveShadow = true;
        
        // Wheel rim - distinctive Ferrari 5-spoke design
        const rimGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.26, wheelSegments);
        const rim = new THREE.Mesh(rimGeometry, wheelMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(x, 0.4, z);
        rim.castShadow = true;
        
        // Spokes (Ferrari 5-spoke star pattern)
        const spokeGroup = new THREE.Group();
        for (let i = 0; i < 5; i++) {
            const spokeGeometry = new THREE.BoxGeometry(0.25, 0.04, 0.07);
            const spoke = new THREE.Mesh(spokeGeometry, wheelMaterial);
            const angle = (i / 5) * Math.PI * 2;
            spoke.position.y = Math.sin(angle) * 0.15;
            spoke.position.z = Math.cos(angle) * 0.15;
            spoke.rotation.z = angle + Math.PI / 2; // Rotate to match angle
            spokeGroup.add(spoke);
        }
        
        spokeGroup.position.set(x, 0.4, z);
        spokeGroup.rotation.z = Math.PI / 2;
        spokeGroup.rotation.y = Math.PI / 2;
        
        carGroup.add(tire);
        carGroup.add(rim);
        carGroup.add(spokeGroup);
        
        // Add the wheel to the wheelMeshes array for animation
        wheelMeshes.push({ tire, rim, spokeGroup });
        
        return { tire, rim, spokeGroup };
    };
    
    // Adjust wheel positions for Ferrari-style wide stance
    createWheel(1.7, 0.95); // Front right
    createWheel(1.7, -0.95); // Front left
    createWheel(-1.6, 0.95); // Rear right
    createWheel(-1.6, -0.95); // Rear left
    
    // Add dual exhaust pipes (Ferrari style)
    const createDualExhausts = () => {
        const createExhaustPipe = (z) => {
            const exhaustGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16);
            const exhaust = new THREE.Mesh(exhaustGeometry, detailMaterial);
            exhaust.position.set(-2.3, 0.35, z);
            exhaust.rotation.z = Math.PI / 2;
            exhaust.castShadow = true;
            carGroup.add(exhaust);
        };
        
        createExhaustPipe(0.25); // Right exhaust
        createExhaustPipe(-0.25); // Left exhaust
    };
    
    createDualExhausts();
    
    // Add Ferrari-style logo on front (simplified)
    if (isPlayerCar && detailLevel === 'high') {
        const logoGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
        const logoMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00, // Gold color for logo
            metalness: 1.0,
            roughness: 0.3
        });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(2.4, 0.6, 0);
        logo.castShadow = true;
        carGroup.add(logo);
    }
    
    // Add the car to the scene
    carGroup.position.y = 0;
    scene.add(carGroup);
    
    return carGroup;
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
                camera.position.set(6, 10, 15);
                camera.lookAt(0, 0, 0);
                break;
            case 'KeyD':
                // Demo mode - car drives forward
                startDrivingAnimation();
                break;
            case 'KeyC':
                // Change camera view
                changeCameraView();
                break;
            case 'KeyP':
                // Toggle performance mode
                togglePerformanceMode();
                break;
        }
    });
    
    // Add event listener for pointer move
    document.addEventListener('mousemove', onPointerMove);
}

let currentCameraView = 'overhead';
function changeCameraView() {
    switch (currentCameraView) {
        case 'overhead':
            // Switch to driver view
            camera.position.set(0, 1.6, -1);
            camera.lookAt(0, 1.6, -10);
            controls.target.set(0, 1.6, -10);
            currentCameraView = 'driver';
            break;
        case 'driver':
            // Switch to third person view - now an aerial view of traffic
            camera.position.set(0, 8, 5);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            currentCameraView = 'thirdPerson';
            break;
        case 'thirdPerson':
            // Switch back to overhead view
            camera.position.set(6, 10, 15);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            currentCameraView = 'overhead';
            break;
    }
}

function startDrivingAnimation() {
    isDriving = !isDriving; // Toggle driving state
}

function onPointerMove(event) {
    // Since car is removed, this function no longer needs to do anything
    // with the car movement
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update FPS counter
    updateFpsCounter();
    
    // Update frustum for culling
    updateFrustum();
    
    // Update controls
    controls.update();
    
    // Animate visible objects only
    animateVisibleObjects();
    
    // Render with post-processing
    composer.render();
}

// FPS counter update
function updateFpsCounter() {
    frameCount++;
    const now = performance.now();
    
    // Update FPS display once per second
    if (now - lastFpsUpdateTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdateTime));
        fpsCounter.textContent = `FPS: ${fps} (${lowPerformanceMode ? 'Low' : 'High'} Quality)`;
        
        // Reset for next update
        frameCount = 0;
        lastFpsUpdateTime = now;
    }
}

// Update the view frustum for culling objects
function updateFrustum() {
    camera.updateMatrixWorld();
    frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(frustumMatrix);
}

// Only animate objects that are in view
function animateVisibleObjects() {
    // Animate the player car - but it's removed from scene
    if (car) {
        // Gentle floating movement if not driving
        if (!isDriving) {
            car.position.y = Math.sin(Date.now() * 0.001) * 0.05;
        } else {
            // Drive the car forward in the correct direction based on its rotation
            car.position.z -= 0.1; // Move along negative Z axis
            
            // Reset position when it goes too far
            if (car.position.z < -50) {
                car.position.z = 20;
            }
        }
        
        // Animate wheels rotation
        const wheelSpeed = isDriving ? 0.2 : 0.02;
        
        // Only animate the player car's wheels by using the first 4 wheels in the array
        for (let i = 0; i < 4; i++) {
            if (wheelMeshes[i]) {
                wheelMeshes[i].spokeGroup.rotation.x += wheelSpeed;
            }
        }
    }
    
    // Store positions of all cars for collision detection
    const carPositions = [];
    
    // First pass: collect all car positions
    trafficCars.forEach(trafficCar => {
        carPositions.push({
            x: trafficCar.car.position.x,
            z: trafficCar.car.position.z,
            dir: trafficCar.lane.dir,
            speed: trafficCar.speed
        });
    });
    
    // Second pass: update car positions based on traffic lights and proximity to other cars
    trafficCars.forEach((trafficCar, index) => {
        // Get the car's position
        const position = trafficCar.car.position;
        
        // Check if car is within frustum or near enough to camera
        const distanceToCamera = camera.position.distanceTo(position);
        const isVisible = frustum.containsPoint(position) || distanceToCamera < SETTINGS.trafficCarLOD;
        
        // Only update if visible
        if (isVisible) {
            // Check traffic light condition
            const movingInWrongDirection = trafficCar.lane.dir < 0;
            const nearIntersection = position.z < 5 && position.z > -5;
            const shouldStopForLight = !isTrafficLightGreen && 
                                    !movingInWrongDirection && 
                                    nearIntersection;
            
            // Initialize target speed based on traffic light status
            let targetSpeed = shouldStopForLight ? 0 : trafficCar.speed;
            
            // Create a reference to current speed if it doesn't exist
            if (trafficCar.currentSpeed === undefined) {
                trafficCar.currentSpeed = trafficCar.speed;
            }
            
            // Check distance to cars ahead
            let minDistanceToCarAhead = Infinity;
            let carAheadSpeed = 0;
            
            for (let i = 0; i < carPositions.length; i++) {
                const pos = carPositions[i];
                // Skip self
                if (pos.x === position.x && pos.z === position.z) continue;
                
                // Only check for cars in the same lane (same x position)
                if (Math.abs(position.x - pos.x) < 0.5) {
                    // Calculate distance based on direction of travel
                    const distanceToCarAhead = trafficCar.lane.dir > 0 
                        ? pos.z - position.z   // Forward lane: car ahead is at higher z
                        : position.z - pos.z;  // Backward lane: car ahead is at lower z
                    
                    // Only consider cars ahead of this one
                    if (distanceToCarAhead > 0 && distanceToCarAhead < minDistanceToCarAhead) {
                        minDistanceToCarAhead = distanceToCarAhead;
                        carAheadSpeed = pos.speed;
                    }
                }
            }
            
            // Define distances for different behaviors
            const emergencyBrakeDistance = 2.5;  // Distance at which to stop completely
            const slowDownDistance = 6.0;        // Distance at which to start slowing down
            const followDistance = 4.0;          // Distance at which to follow at the same speed
            
            // Adjust target speed based on distance to car ahead
            if (minDistanceToCarAhead < emergencyBrakeDistance) {
                // Emergency brake - stop completely
                targetSpeed = 0;
            } else if (minDistanceToCarAhead < followDistance) {
                // Follow the car ahead at its speed or slightly slower
                targetSpeed = Math.min(trafficCar.speed, carAheadSpeed * 0.9);
            } else if (minDistanceToCarAhead < slowDownDistance) {
                // Gradually slow down as we approach
                const slowDownFactor = (minDistanceToCarAhead - emergencyBrakeDistance) / 
                                      (slowDownDistance - emergencyBrakeDistance);
                targetSpeed = trafficCar.speed * slowDownFactor;
            }
            
            // Smoothly adjust current speed towards target speed
            const acceleration = targetSpeed > trafficCar.currentSpeed ? 0.001 : 0.003; // Brake faster than accelerate
            
            if (Math.abs(targetSpeed - trafficCar.currentSpeed) > 0.001) {
                trafficCar.currentSpeed += (targetSpeed - trafficCar.currentSpeed) * acceleration;
            } else {
                trafficCar.currentSpeed = targetSpeed;
            }
            
            // Move the car based on current speed
            if (trafficCar.currentSpeed > 0.001) {
                // Move the car along the lane
                position.z += trafficCar.lane.dir * trafficCar.currentSpeed;
                
                // Animate wheels proportionally to the current speed
                if (distanceToCamera < 30) {
                    const wheelRotationSpeed = trafficCar.currentSpeed * 0.5;
                    trafficCar.wheels.forEach(wheel => {
                        wheel.spokeGroup.rotation.x += wheelRotationSpeed;
                    });
                }
                
                // Reset position when it goes out of view
                if (trafficCar.lane.dir > 0 && position.z > 40) {
                    position.z = -40;
                    // Reset to full speed after looping around
                    trafficCar.currentSpeed = trafficCar.speed;
                } else if (trafficCar.lane.dir < 0 && position.z < -40) {
                    position.z = 40;
                    // Reset to full speed after looping around
                    trafficCar.currentSpeed = trafficCar.speed;
                }
                
                // Regular driving animation - slight float
                if (distanceToCamera < 20) {
                    position.y = Math.sin((Date.now() + index * 500) * 0.001) * 0.05;
                }
            } else {
                // Stopped car animation - more noticeable bounce
                position.y = Math.sin(Date.now() * 0.003) * 0.05 + 0.05;
                
                // Very slight forward creep even when "stopped" for realism
                position.z += trafficCar.lane.dir * 0.0005;
            }
        }
    });
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
    
    // Resize renderer and composer with resolution multiplier for low performance devices
    const resolutionMultiplier = lowPerformanceMode ? 0.75 : 1.0;
    const width = window.innerWidth * resolutionMultiplier;
    const height = window.innerHeight * resolutionMultiplier;
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
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

function togglePerformanceMode() {
    lowPerformanceMode = !lowPerformanceMode;
    
    // Update settings based on performance mode
    if (lowPerformanceMode) {
        SETTINGS.shadowMapSize = 512;
        SETTINGS.trafficLightLOD = 8;
        SETTINGS.trafficCarLOD = 30;
        SETTINGS.maxLights = 3;
        SETTINGS.bloomStrength = 0.1;
        SETTINGS.bloomRadius = 0.2;
        SETTINGS.shadowsEnabled = false;
    } else {
        SETTINGS.shadowMapSize = 1024;
        SETTINGS.trafficLightLOD = 12;
        SETTINGS.trafficCarLOD = 50;
        SETTINGS.maxLights = 6;
        SETTINGS.bloomStrength = 0.2;
        SETTINGS.bloomRadius = 0.3;
        SETTINGS.shadowsEnabled = true;
    }
    
    // Update shadow settings
    lights.forEach(light => {
        if (light.shadow) {
            light.castShadow = SETTINGS.shadowsEnabled;
            if (light.shadow.mapSize) {
                light.shadow.mapSize.width = SETTINGS.shadowMapSize;
                light.shadow.mapSize.height = SETTINGS.shadowMapSize;
            }
        }
    });
    
    // Update bloom effect
    composer.passes.forEach(pass => {
        if (pass instanceof UnrealBloomPass) {
            pass.strength = SETTINGS.bloomStrength;
            pass.radius = SETTINGS.bloomRadius;
            if (lowPerformanceMode) {
                pass.resolution = new THREE.Vector2(
                    window.innerWidth * 0.5,
                    window.innerHeight * 0.5
                );
            } else {
                pass.resolution = new THREE.Vector2(
                    window.innerWidth,
                    window.innerHeight
                );
            }
        }
    });
    
    // Trigger resize to update renderer resolution
    onWindowResize();
    
    console.log(`Performance mode: ${lowPerformanceMode ? 'Low' : 'High'}`);
} 