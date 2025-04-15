const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

// Function to get all image files from the images directory
function getImageFiles() {
    const imageDir = path.join(process.cwd(), 'images');
    try {
        const files = fs.readdirSync(imageDir);
        // Filter only image files with proper extensions
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });
        return imageFiles.map(file => ({ 
            name: file,
            url: `/images/${file}`,
            thumbnail: `/images/${file}`
        }));
    } catch (err) {
        console.error('Error reading images directory:', err);
        return [];
    }
}

const server = http.createServer((req, res) => {
    // Normalize URL by removing query string and decoding URI
    let parsedUrl = url.parse(req.url);
    let pathname = decodeURI(parsedUrl.pathname);
    
    // API endpoint to get all images
    if (pathname === '/api/images') {
        const images = getImageFiles();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(images));
        console.log('200: /api/images - Returned list of', images.length, 'images');
        return;
    }
    
    // Convert relative path to absolute
    let filePath = path.join(process.cwd(), pathname);
    
    // Default to index.html if requesting directory
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }
    
    // Get file extension
    const ext = path.parse(filePath).ext;
    
    // If file doesn't exist, return 404
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end(`File ${pathname} not found!`);
        console.log(`404: ${pathname}`);
        return;
    }
    
    // Read file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end(`Error reading file: ${err.message}`);
            console.log(`500: ${err.message}`);
            return;
        }
        
        // Set content type
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
        console.log(`200: ${pathname}`);
    });
});

server.listen(PORT, () => {
    console.clear();
    console.log('='.repeat(50));
    console.log(`🚀 Three.js Image Re-Animation Server`);
    console.log('='.repeat(50));
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`\nOpen one of these URLs in your browser:`);
    console.log(`🌊 Wave Effect:     http://localhost:${PORT}/index.html`);
    console.log(`✌️ 3D Sports Car:   http://localhost:${PORT}/3d-sportscar.html`);
    console.log(`🚙 3D Jeep:         http://localhost:${PORT}/3d-jeep.html`);
    console.log(`🌟 Particle Effects: http://localhost:${PORT}/particle-animation.html`);
    console.log(`📸 Image Gallery:   http://localhost:${PORT}/image-gallery.html`);
    console.log(`🏙️ 3D Tiles:        http://localhost:${PORT}/3d-tiles.html`);
    console.log(`🚏 Project 2:       http://localhost:${PORT}/keyframe-animation.html`);
    console.log(`🤖 Project 3:       http://localhost:${PORT}/project3-animation.html`);
    console.log(`🌋 Project 8:       http://localhost:${PORT}/lava-shader.html`);
    console.log('--------------------------------------------------------------------------------');
    console.log('\nMake sure you have added images to the images/ directory');
    console.log('\nPress Ctrl+C to stop the server');
    console.log('='.repeat(50));
}); 