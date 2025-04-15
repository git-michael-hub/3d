import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up 3D image gallery...');

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
let currentImageIndex = 0;
let images = [];
let imageFrames = [];
let gallery;

// Settings
const settings = {
    galleryRadius: 10,
    imageWidth: 3,
    imageHeight: 2,
    spacing: 15, // Angle between images in degrees
    rotationSpeed: 0.005,
    autoRotate: true,
    bloomStrength: 0.5,
    bloomRadius: 0.3,
    bloomThreshold: 0.9
};

// Initialize the scene
init();

async function init() {
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 12;
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 5;
        controls.maxDistance = 20;
        controls.enablePan = false;
        controls.autoRotate = settings.autoRotate;
        controls.autoRotateSpeed = 1.0;
        
        // Setup post-processing
        setupPostProcessing();
        
        // Add lighting
        setupLighting();
        
        // Add gallery container
        gallery = new THREE.Group();
        scene.add(gallery);
        
        // Create a temporary loading object
        createLoadingObject();
        
        // Fetch images from API
        await fetchImages();
        
        // Create the image gallery
        createImageGallery();
        
        // Handle keyboard events
        setupKeyboardControls();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Hide loading screen
        document.getElementById('loading').classList.add('hidden');
        
        // Start animation loop
        animate();
        
        console.log('Gallery setup complete');
    } catch (error) {
        console.error('Error setting up gallery:', error);
        showError('Failed to set up the gallery: ' + error.message);
    }
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        settings.bloomStrength,
        settings.bloomRadius,
        settings.bloomThreshold
    );
    composer.addPass(bloomPass);
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Additional point lights for dramatic effect
    const colors = [0x0088ff, 0xff8800, 0x88ff00];
    colors.forEach((color, i) => {
        const light = new THREE.PointLight(color, 0.5, 20);
        const angle = (i / colors.length) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 15,
            0,
            Math.sin(angle) * 15
        );
        scene.add(light);
    });
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
    
    // Return the cube so we can remove it later
    return cube;
}

async function fetchImages() {
    try {
        const response = await fetch('/api/images');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        images = await response.json();
        console.log('Loaded images:', images);
        
        if (images.length === 0) {
            showError('No images found in the images directory!');
        }
    } catch (error) {
        console.error('Error fetching images:', error);
        showError('Failed to load images: ' + error.message);
        images = []; // Ensure images is at least an empty array
    }
}

function createImageGallery() {
    // Remove any loading objects
    scene.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
            scene.remove(child);
        }
    });
    
    // Clear existing frames
    gallery.clear();
    imageFrames = [];
    
    if (images.length === 0) {
        // If no images, show a message
        createNoImagesMessage();
        return;
    }
    
    // Calculate angles for a circular gallery
    const angleStep = (Math.PI * 2) / images.length;
    
    // Load textures and create frames
    images.forEach((image, index) => {
        loadImageTexture(image.url, (texture) => {
            const frame = createImageFrame(texture, index, angleStep);
            imageFrames.push(frame);
            gallery.add(frame);
        });
    });
}

function loadImageTexture(url, callback) {
    new THREE.TextureLoader().load(
        url,
        callback,
        undefined, // onProgress callback not needed
        (err) => {
            console.error('Error loading texture:', url, err);
        }
    );
}

function createImageFrame(texture, index, angleStep) {
    // Calculate aspect ratio for the frame
    const aspectRatio = texture.image.width / texture.image.height;
    const frameWidth = settings.imageWidth;
    const frameHeight = frameWidth / aspectRatio;
    
    // Create a frame group
    const frame = new THREE.Group();
    
    // Position the frame in a circle
    const angle = index * angleStep;
    const x = Math.cos(angle) * settings.galleryRadius;
    const z = Math.sin(angle) * settings.galleryRadius;
    frame.position.set(x, 0, z);
    
    // Make frame face the center
    frame.lookAt(0, 0, 0);
    
    // Create the image plane
    const geometry = new THREE.PlaneGeometry(frameWidth, frameHeight, 32, 32);
    
    // Create custom shader material for animated effect
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            imageTexture: { value: texture },
            selected: { value: index === currentImageIndex ? 1.0 : 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform float time;
            uniform float selected;
            
            void main() {
                vUv = uv;
                
                // Add wave effect that's stronger when selected
                vec3 newPosition = position;
                float waveStrength = 0.05 + selected * 0.10;
                float frequency = 5.0 + selected * 3.0;
                
                newPosition.z += sin(position.y * frequency + time) * waveStrength;
                newPosition.z += cos(position.x * frequency + time * 0.7) * waveStrength;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D imageTexture;
            varying vec2 vUv;
            uniform float time;
            uniform float selected;
            
            void main() {
                // Slightly distort UVs for selected frames
                vec2 distortedUV = vUv;
                float distortStrength = 0.005 + selected * 0.01;
                
                distortedUV.x += sin(vUv.y * 10.0 + time) * distortStrength;
                distortedUV.y += cos(vUv.x * 10.0 + time * 0.8) * distortStrength;
                
                vec4 texColor = texture2D(imageTexture, distortedUV);
                
                // Add a glow effect for selected image
                vec3 color = texColor.rgb;
                if (selected > 0.5) {
                    // Enhance colors for selected image
                    color.r += sin(time * 0.5) * 0.1;
                    color.g += cos(time * 0.5) * 0.1;
                    color.b += sin(time * 0.7) * 0.1;
                }
                
                gl_FragColor = vec4(color, texColor.a);
            }
        `,
        side: THREE.DoubleSide,
        transparent: true
    });
    
    const imagePlane = new THREE.Mesh(geometry, material);
    frame.add(imagePlane);
    
    // Add a frame around the image
    addFrameBorder(frame, frameWidth, frameHeight);
    
    // Apply a random initial rotation offset
    frame.userData = {
        initialRotation: Math.random() * Math.PI * 2,
        index: index
    };
    
    return frame;
}

function addFrameBorder(frame, width, height) {
    // Create frame material
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x222222
    });
    
    // Frame border thickness
    const border = 0.1;
    const depth = 0.05;
    
    // Create top border
    const topGeometry = new THREE.BoxGeometry(width + border * 2, border, depth);
    const topBorder = new THREE.Mesh(topGeometry, frameMaterial);
    topBorder.position.y = height / 2 + border / 2;
    topBorder.position.z = -depth / 2;
    frame.add(topBorder);
    
    // Create bottom border
    const bottomGeometry = new THREE.BoxGeometry(width + border * 2, border, depth);
    const bottomBorder = new THREE.Mesh(bottomGeometry, frameMaterial);
    bottomBorder.position.y = -height / 2 - border / 2;
    bottomBorder.position.z = -depth / 2;
    frame.add(bottomBorder);
    
    // Create left border
    const leftGeometry = new THREE.BoxGeometry(border, height + border * 2, depth);
    const leftBorder = new THREE.Mesh(leftGeometry, frameMaterial);
    leftBorder.position.x = -width / 2 - border / 2;
    leftBorder.position.z = -depth / 2;
    frame.add(leftBorder);
    
    // Create right border
    const rightGeometry = new THREE.BoxGeometry(border, height + border * 2, depth);
    const rightBorder = new THREE.Mesh(rightGeometry, frameMaterial);
    rightBorder.position.x = width / 2 + border / 2;
    rightBorder.position.z = -depth / 2;
    frame.add(rightBorder);
    
    // Add a backing
    const backingGeometry = new THREE.BoxGeometry(width, height, 0.01);
    const backingMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9
    });
    const backing = new THREE.Mesh(backingGeometry, backingMaterial);
    backing.position.z = -0.03;
    frame.add(backing);
}

function createNoImagesMessage() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Draw background
    context.fillStyle = '#333333';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = '24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('No images found in the /images directory', canvas.width / 2, canvas.height / 2 - 20);
    context.fillText('Add some .jpg, .png or .gif files to get started', canvas.width / 2, canvas.height / 2 + 20);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create plane
    const geometry = new THREE.PlaneGeometry(5, 2.5);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const messagePlane = new THREE.Mesh(geometry, material);
    
    // Add to scene
    scene.add(messagePlane);
}

function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'ArrowLeft':
                navigateToImage(currentImageIndex - 1);
                break;
            case 'ArrowRight':
                navigateToImage(currentImageIndex + 1);
                break;
            case 'Space':
                controls.autoRotate = !controls.autoRotate;
                break;
        }
    });
}

function navigateToImage(index) {
    if (images.length === 0) return;
    
    // Ensure index wraps around
    currentImageIndex = ((index % images.length) + images.length) % images.length;
    
    // Update which image is selected
    imageFrames.forEach((frame, i) => {
        const material = frame.children[0].material;
        material.uniforms.selected.value = (i === currentImageIndex) ? 1.0 : 0.0;
    });
    
    // Rotate gallery to face the current image
    rotateGalleryToCurrentImage();
}

function rotateGalleryToCurrentImage() {
    if (images.length === 0 || !imageFrames[currentImageIndex]) return;
    
    // Disable auto-rotation temporarily
    const wasAutoRotating = controls.autoRotate;
    controls.autoRotate = false;
    
    // Get the position of the current image frame
    const frame = imageFrames[currentImageIndex];
    const angle = Math.atan2(frame.position.z, frame.position.x);
    
    // Create a target position in front of the current image
    const targetPosition = new THREE.Vector3(
        Math.cos(angle) * settings.galleryRadius * 0.6,
        0,
        Math.sin(angle) * settings.galleryRadius * 0.6
    );
    
    // Animate camera moving to this position
    animateCameraMovement(targetPosition, 1000, () => {
        controls.autoRotate = wasAutoRotating;
    });
}

function animateCameraMovement(target, duration, callback) {
    const startPosition = camera.position.clone();
    const startTime = Date.now();
    
    function updateCameraPosition() {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (elapsed < duration) {
            // Easing function (ease out cubic)
            const t = 1 - Math.pow(1 - elapsed / duration, 3);
            camera.position.lerpVectors(startPosition, target, t);
            requestAnimationFrame(updateCameraPosition);
        } else {
            // Animation complete
            camera.position.copy(target);
            if (callback) callback();
        }
    }
    
    updateCameraPosition();
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
    
    // Update time for all animated materials
    const time = performance.now() * 0.001;
    
    // Update materials for each frame
    imageFrames.forEach(frame => {
        if (frame.children[0] && frame.children[0].material && frame.children[0].material.uniforms) {
            frame.children[0].material.uniforms.time.value = time;
        }
        
        // Add some floating movement
        const initialRotation = frame.userData.initialRotation || 0;
        frame.position.y = Math.sin(time * 0.5 + initialRotation) * 0.2;
    });
    
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