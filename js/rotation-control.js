// Rotation Speed Control
(function() {
    console.log('Rotation Speed Controller initialized');
    
    // Global variables to be accessed by main.js
    window.rotationSpeedFactor = 1.0;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initRotationControl);
    
    // Also try to initialize immediately in case DOM is already loaded
    initRotationControl();
    
    // Set a timer to retry initialization if elements aren't found immediately
    setTimeout(initRotationControl, 500);
    
    function initRotationControl() {
        const speedSlider = document.getElementById('rotation-speed');
        const speedValue = document.getElementById('rotation-speed-value');
        
        if (!speedSlider || !speedValue) {
            console.log('Rotation speed controls not found yet, will retry later');
            setTimeout(initRotationControl, 500);
            return;
        }
        
        // Check if already initialized to prevent duplicate listeners
        if (speedSlider.getAttribute('data-initialized') === 'true') {
            return;
        }
        
        console.log('Found rotation speed controls, setting up event listeners');
        speedSlider.setAttribute('data-initialized', 'true');
        
        // Add event listener for the rotation speed slider
        speedSlider.addEventListener('input', function(event) {
            // Use logarithmic scaling for better control
            const sliderValue = parseFloat(event.target.value);
            let speed;
            
            if (sliderValue <= 1) {
                speed = sliderValue;
            } else if (sliderValue <= 10) {
                speed = 1 + (sliderValue - 1) * 2; // 1-10 slider = 1-19x speed
            } else {
                speed = 19 + (sliderValue - 10) * 9; // 10-100 slider = 19-100x speed
            }
            
            // Round to 1 decimal place for display
            const displaySpeed = Math.round(speed * 10) / 10;
            
            // Update global variable and display
            window.rotationSpeedFactor = speed;
            speedValue.textContent = displaySpeed + 'x';
            
            console.log('Rotation speed set to:', speed);
        });
        
        // Initialize with default value
        window.rotationSpeedFactor = 1.0;
        speedValue.textContent = '1x';
    }
})(); 