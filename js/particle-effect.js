import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up particle effect...');

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
    const warning = document.createElement('div');
    warning.style.position = 'absolute';
    warning.style.top = '50%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.padding = '20px';
    warning.style.background = 'red';
    warning.style.color = 'white';
    warning.style.fontFamily = 'Arial, sans-serif';
    warning.textContent = 'WebGL is not available on your browser or device.';
    document.body.appendChild(warning);
    throw new Error('WebGL not available');
}

let scene, camera, renderer, particles, imageData;
let width = 0, height = 0;
const particleSize = 2; // Size of each particle

// Create a simple test cube to check if rendering works
let testCube = null;

// Initialize the scene
function init() {
    console.log('Initializing scene');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 50;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    
    console.log('Canvas added to DOM');
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Create a test cube to ensure rendering works
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    testCube = new THREE.Mesh(geometry, material);
    scene.add(testCube);
    
    // Render the test cube immediately
    renderer.render(scene, camera);
    console.log('Test cube rendered');
    
    // Load the image
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = 'images/image.jpg'; // Use your image path
    console.log('Loading image from:', img.src);
    
    // Add a loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loadingMessage';
    loadingMessage.style.position = 'absolute';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.padding = '20px';
    loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
    loadingMessage.style.color = 'white';
    loadingMessage.style.fontFamily = 'Arial, sans-serif';
    loadingMessage.textContent = 'Loading image...';
    document.body.appendChild(loadingMessage);
    
    img.onload = function() {
        console.log('Image loaded successfully');
        document.getElementById('loadingMessage').remove();
        
        // Get image data
        width = img.width;
        height = img.height;
        
        console.log('Image dimensions:', width, 'x', height);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
            imageData = ctx.getImageData(0, 0, width, height).data;
            console.log('Image data extracted, length:', imageData.length);
            
            // Create particles
            createParticles();
            
            // Start animation
            animate();
        } catch (e) {
            console.error('Error getting image data:', e);
            showError('Failed to process image: ' + e.message);
        }
    };
    
    img.onerror = function(e) {
        console.error('Error loading image:', e);
        showError('Failed to load image. Please check if the image exists at images/image.jpg');
    };
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.padding = '20px';
    errorDiv.style.background = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.fontFamily = 'Arial, sans-serif';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
}

// Create particles based on image data
function createParticles() {
    console.log('Creating particles');
    
    try {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: particleSize,
            vertexColors: true,
            transparent: true,
            // Enable depth test so particles render in correct order
            depthTest: true,
            // Enable blending for better visual effect
            blending: THREE.AdditiveBlending,
            // Texture to make particles round
            map: createCircleTexture(),
        });
        
        // Arrays to store particle data
        const positions = [];
        const colors = [];
        const originalPositions = []; // Store original positions for animation
        const sizes = [];
        
        // Determine sampling rate to keep particle count manageable
        const sampleStep = 5; // Skip pixels to reduce particle count
        
        // Sample image pixels at regular intervals and create particles
        let particleCount = 0;
        for (let y = 0; y < height; y += sampleStep) {
            for (let x = 0; x < width; x += sampleStep) {
                const i = (y * width + x) * 4;
                
                // Guard against out-of-bounds
                if (i >= imageData.length) continue;
                
                // Get pixel color
                const r = imageData[i] / 255;
                const g = imageData[i + 1] / 255;
                const b = imageData[i + 2] / 255;
                const a = imageData[i + 3] / 255;
                
                // Skip nearly transparent pixels
                if (a < 0.5) continue;
                
                // Calculate brightness to use for displacement in z-axis
                const brightness = (r + g + b) / 3;
                
                // Center the image by offsetting coordinates
                const xPos = x - width / 2;
                const yPos = height / 2 - y; // Flip y-axis
                const zPos = brightness * 10; // Displace based on brightness
                
                // Add position
                positions.push(xPos, yPos, zPos);
                
                // Store original position for animation
                originalPositions.push(xPos, yPos, zPos);
                
                // Add color
                colors.push(r, g, b);
                
                // Vary size slightly based on brightness
                const size = particleSize * (0.8 + brightness * 0.5);
                sizes.push(size);
                
                particleCount++;
            }
        }
        
        console.log('Created', particleCount, 'particles');
        
        // Add attributes to geometry
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('originalPosition', new THREE.Float32BufferAttribute(originalPositions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create particle system
        particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Remove the test cube
        if (testCube) {
            scene.remove(testCube);
            testCube = null;
        }
        
        console.log('Particles added to scene');
    } catch (e) {
        console.error('Error creating particles:', e);
        showError('Failed to create particles: ' + e.message);
    }
}

// Create a circular texture for particles
function createCircleTexture() {
    try {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Create gradient for soft edges
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    } catch (e) {
        console.error('Error creating circle texture:', e);
        return null;
    }
}

// Handle window resize
function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('Window resized');
}

// Fallback animation with test cube
function fallbackAnimate() {
    if (!renderer || !scene || !camera) return;
    
    requestAnimationFrame(fallbackAnimate);
    
    if (testCube) {
        testCube.rotation.x += 0.01;
        testCube.rotation.y += 0.01;
    }
    
    renderer.render(scene, camera);
}

// Animation loop
function animate() {
    if (!renderer || !scene || !camera || !particles) {
        fallbackAnimate();
        return;
    }
    
    requestAnimationFrame(animate);
    
    try {
        // Animate particles if they exist
        if (particles) {
            const time = Date.now() * 0.001; // Time in seconds
            const positions = particles.geometry.attributes.position.array;
            const originalPositions = particles.geometry.attributes.originalPosition.array;
            
            // Animation effect - wave motion and subtle particle movement
            for (let i = 0; i < positions.length; i += 3) {
                const x = originalPositions[i];
                const y = originalPositions[i + 1];
                const z = originalPositions[i + 2];
                
                // Wave animation
                positions[i] = x + Math.sin(time + x * 0.01) * 2;
                positions[i + 1] = y + Math.cos(time + y * 0.01) * 2;
                positions[i + 2] = z + Math.sin(time * 2) * 5;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Rotate the entire particle system
            particles.rotation.y = time * 0.1;
        }
        
        renderer.render(scene, camera);
    } catch (e) {
        console.error('Error in animation loop:', e);
        fallbackAnimate();
    }
}

// Add a button to toggle debug info
function addDebugUI() {
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.bottom = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.zIndex = '1000';
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Show Debug Info';
    toggleButton.style.padding = '5px 10px';
    
    const debugInfo = document.createElement('div');
    debugInfo.style.marginTop = '10px';
    debugInfo.style.display = 'none';
    
    toggleButton.addEventListener('click', () => {
        if (debugInfo.style.display === 'none') {
            debugInfo.style.display = 'block';
            toggleButton.textContent = 'Hide Debug Info';
            updateDebugInfo();
        } else {
            debugInfo.style.display = 'none';
            toggleButton.textContent = 'Show Debug Info';
        }
    });
    
    function updateDebugInfo() {
        if (debugInfo.style.display === 'none') return;
        
        let info = 'WebGL Available: ' + isWebGLAvailable() + '<br>';
        info += 'Browser: ' + navigator.userAgent + '<br>';
        info += 'Screen: ' + window.innerWidth + 'x' + window.innerHeight + '<br>';
        
        if (particles) {
            info += 'Particles: ' + (particles.geometry.attributes.position.count) + '<br>';
        }
        
        debugInfo.innerHTML = info;
        
        requestAnimationFrame(updateDebugInfo);
    }
    
    debugDiv.appendChild(toggleButton);
    debugDiv.appendChild(debugInfo);
    document.body.appendChild(debugDiv);
}

// Start the animation
console.log('Starting initialization');
addDebugUI();
init();
fallbackAnimate(); // Start fallback animation immediately to ensure something is visible 