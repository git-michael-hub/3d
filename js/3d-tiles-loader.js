// Import necessary Three.js modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TilesRenderer } from 'https://cdn.jsdelivr.net/npm/3d-tiles-renderer@0.4.8/build/three-tiles-renderer.module.js';
import Stats from 'three/addons/libs/stats.module.js';

// Global variables
let camera, scene, renderer, tiles, controls;
let stats, fpsCounter, clock;
let lastTimestamp = 0;
let frameCount = 0;
let loadingElement, loadingProgressElement;
let currentLocation = 'google';
let locations = {
    google: {
        url: 'https://tile.googleapis.com/v1/3dtiles/root.json',
        apiKey: 'AIzaSyDUZQ-LqxgwrMyaZ_JFqWYNNx9fxEZd5W0', // This is a public demo key from Three.js examples
        position: [13676788, -5636094, -3846074], // San Francisco area
        center: new THREE.Vector3(13676788, -5636094, -3846074),
        ellipsoid: true,
        fog: true,
        projection: 'EPSG:4326'
    },
    nyc: {
        url: 'https://storage.googleapis.com/ogc-3d-tiles/samples/seattle/tileset.json',
        position: [0, 0, 0],
        center: new THREE.Vector3(0, 0, 0),
        ellipsoid: false,
        fog: true,
        projection: 'EPSG:4326'
    },
    sf: {
        url: 'https://storage.googleapis.com/ogc-3d-tiles/samples/sf/tileset.json',
        position: [0, 0, 0],
        center: new THREE.Vector3(0, 0, 0),
        ellipsoid: false,
        fog: true,
        projection: 'EPSG:4326'
    },
    seattle: {
        url: 'https://storage.googleapis.com/ogc-3d-tiles/samples/seattle/tileset.json',
        position: [0, 0, 0],
        center: new THREE.Vector3(0, 0, 0),
        ellipsoid: false,
        fog: true,
        projection: 'EPSG:4326'
    }
};

// Initialize the scene
init();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls
    controls.update();
    
    // Update tiles
    if (tiles) {
        tiles.update();
        updateLoadingStatus();
    }
    
    // Update FPS counter
    updateFPS(delta);
    
    // Update stats
    if (stats) {
        stats.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Initialize the scene
function init() {
    // Get DOM elements
    loadingElement = document.getElementById('loading');
    loadingProgressElement = document.getElementById('loading-progress');
    fpsCounter = document.getElementById('fps-counter');
    
    // Setup clock
    clock = new THREE.Clock();
    
    // Setup stats
    stats = new Stats();
    const statsContainer = document.getElementById('stats-container');
    statsContainer.appendChild(stats.dom);
    
    // Create scene
    scene = new THREE.Scene();
    
    // Add fog to the scene
    scene.fog = new THREE.Fog(0x000000, 10000, 50000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000000);
    camera.position.set(0, 200, 200);
    
    // Create hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);
    
    // Create directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0.5, 1, 0.75);
    scene.add(dirLight);
    
    // Create ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 1000000;
    
    // Event listener for window resize
    window.addEventListener('resize', onWindowResize);
    
    // Event listener for location change
    document.getElementById('locations').addEventListener('change', function(e) {
        currentLocation = e.target.value;
        loadTileset(currentLocation);
    });
    
    // Add keyboard event listener
    window.addEventListener('keydown', onKeyDown);
    
    // Load initial tileset
    loadTileset(currentLocation);
    
    // Start animation loop
    animate();
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Keyboard controls
function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'r':
            resetCamera();
            break;
    }
}

// Reset camera position
function resetCamera() {
    const location = locations[currentLocation];
    if (location.center) {
        controls.target.copy(location.center);
        camera.position.set(
            location.center.x + 200,
            location.center.y + 200,
            location.center.z + 200
        );
        camera.lookAt(location.center);
        controls.update();
    }
}

// Load a tileset based on the selected location
function loadTileset(locationKey) {
    // Show loading screen
    loadingElement.classList.remove('hidden');
    loadingProgressElement.textContent = '0%';
    
    // Remove existing tileset
    if (tiles) {
        tiles.dispose();
        scene.remove(tiles.group);
    }
    
    const location = locations[locationKey];
    
    // Create new tileset renderer
    tiles = new TilesRenderer(location.url, camera, scene);
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);
    
    // Add API key for Google Photorealistic Tiles if needed
    if (locationKey === 'google' && location.apiKey) {
        tiles.fetchOptions.headers = {
            'X-GOOG-API-KEY': location.apiKey
        };
    }
    
    // Set initial camera position
    if (location.position) {
        camera.position.set(location.position[0] + 200, location.position[1] + 200, location.position[2] + 200);
        camera.lookAt(new THREE.Vector3(location.position[0], location.position[1], location.position[2]));
        
        if (location.center) {
            controls.target.copy(location.center);
        } else {
            controls.target.set(location.position[0], location.position[1], location.position[2]);
        }
        
        controls.update();
    }
    
    // Load the tileset
    tiles.load()
        .then(() => {
            console.log('Tileset loaded successfully');
            
            // The loading screen will be hidden by updateLoadingStatus when 
            // the tiles are fully loaded
        })
        .catch(error => {
            console.error('Error loading tileset:', error);
            loadingElement.querySelector('#loading-text').textContent = 'Error loading 3D Tiles';
            loadingProgressElement.textContent = 'Please try another location';
        });
}

// Update loading status
function updateLoadingStatus() {
    if (!tiles) return;
    
    const tilesLoading = tiles.stats.downloading;
    const tilesTotal = tiles.stats.downloading + tiles.stats.downloaded + tiles.stats.parsing + tiles.stats.parsed;
    
    if (tilesTotal > 0) {
        const progress = Math.floor(((tilesTotal - tilesLoading) / tilesTotal) * 100);
        loadingProgressElement.textContent = `${progress}%`;
        
        if (progress > 70 && tilesLoading === 0) {
            // Hide loading screen when enough tiles are loaded
            loadingElement.classList.add('hidden');
        }
    }
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