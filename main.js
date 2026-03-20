// --- 1. Theme Logic ---
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
}

themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateChartColors(isDark);
    init(); // Refresh particles for theme color
});

// --- 2. Scroll Logic ---
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// --- 3. Particle Canvas ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

function setSize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', setSize);
setSize();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }
    update(color) {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

function init() {
    particlesArray = [];
    for (let i = 0; i < 80; i++) particlesArray.push(new Particle());
}

// Change the color logic in your animate() function:
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Increased opacity for light mode particles (0.2 -> 0.5)
    const color = body.classList.contains('dark-mode') 
        ? 'rgba(0, 240, 255, 0.3)' 
        : 'rgba(51, 65, 85, 0.5)'; // Darker slate for better contrast
    particlesArray.forEach(p => p.update(color));
    requestAnimationFrame(animate);
}
init(); animate();

// --- 4. Chart.js ---
const chartCtx = document.getElementById('mockChart').getContext('2d');
let mockChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: Array(10).fill(''),
        datasets: [{
            data: [120, 150, 180, 170, 210, 230, 200, 240, 250, 280],
            borderColor: '#00f0ff',
            tension: 0.4, fill: true,
            backgroundColor: 'rgba(0, 240, 255, 0.05)'
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { grid: { display: false }, ticks: { display: false } } }
    }
}); // <-- FIXED: Added missing closure

// FIXED: Added the missing function to update chart grid lines/colors on theme toggle
function updateChartColors(isDark) {
    if(!mockChart) return;
    const newColor = isDark ? '#00f0ff' : '#2563eb';
    const newBg = isDark ? 'rgba(0, 240, 255, 0.05)' : 'rgba(37, 99, 235, 0.05)';
    mockChart.data.datasets[0].borderColor = newColor;
    mockChart.data.datasets[0].backgroundColor = newBg;
    mockChart.update();
}

// --- 5. Web Bluetooth HR Integration ---
const connectHRMButton = document.getElementById('connect-hrm');

connectHRMButton.addEventListener('click', async () => {
    try {
        // Request a Bluetooth device that broadcasts Heart Rate
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }]
        });
        
        // Connect to the GATT server
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');
        
        // Start receiving live data
        await characteristic.startNotifications();
        
        // Update UI to show successful connection
        document.querySelector('.badge').textContent = `SYNCED: ${device.name.toUpperCase()}`;
        document.querySelector('.status-pulse').style.background = "#ff4b4b"; // Change pulse to red
        connectHRMButton.textContent = "Telemetry Active";
        connectHRMButton.style.background = "linear-gradient(45deg, #16a34a, #22c55e)"; // Green gradient
        
        // Stop the mock chart interval so live data takes over
        clearInterval(mockInterval); 

        // Handle incoming heart rate data
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            // The first byte contains flags, the second byte is the heart rate
            const currentHeartRate = value.getUint8(1);
            
            // Push live data to Chart.js
            mockChart.data.datasets[0].data.shift();
            mockChart.data.datasets[0].data.push(currentHeartRate);
            mockChart.update('none');
            
            // Update Dashboard Numbers
            document.querySelector('.mini-stat:first-child strong').textContent = currentHeartRate + ' BPM';
            document.querySelector('.mini-stat:first-child span').textContent = 'Live Cardiac Load';
        });

    } catch (error) {
        console.error('Bluetooth Connection Failed:', error);
        alert('Could not connect to wearable. Please ensure your Bluetooth is on and the device is awake.');
    }
});

// Modify your existing Chart interval to be assigned to a variable so we can clear it later
const mockInterval = setInterval(() => {
    mockChart.data.datasets[0].data.shift();
    mockChart.data.datasets[0].data.push(Math.floor(Math.random() * 40) + 120);
    mockChart.update('none');
}, 2000);

// --- 6. 3D Kinematic Hologram (Three.js) ---
const container = document.getElementById('kinematic-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Create a stylized wireframe capsule to represent athletic load
const geometry = new THREE.CapsuleGeometry(1, 3, 4, 16);
const material = new THREE.MeshBasicMaterial({ 
    color: 0x00f0ff, 
    wireframe: true,
    transparent: true,
    opacity: 0.8
});
const holographicTorso = new THREE.Mesh(geometry, material);
scene.add(holographicTorso);

camera.position.z = 5;

// Animation Loop
function animate3D() {
    requestAnimationFrame(animate3D);
    // Standard rotation
    holographicTorso.rotation.y += 0.01;
    holographicTorso.rotation.x += 0.005;
    
    // Simulate data-driven color shifting (Pulse red for high load)
    const time = Date.now() * 0.001;
    const loadSpike = Math.sin(time * 2); // Simulating a load spike every few seconds
    
    if (loadSpike > 0.8) {
        material.color.setHex(0xff4b4b); // Danger/Red
        holographicTorso.scale.set(1.1, 1.1, 1.1);
    } else {
        material.color.setHex(body.classList.contains('dark-mode') ? 0x00f0ff : 0x0284c7); // Back to cyan/blue
        holographicTorso.scale.set(1, 1, 1);
    }
    
    renderer.render(scene, camera);
}
animate3D();

// Handle resizing
window.addEventListener('resize', () => {
    if(container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});

// --- 7. AI Coach Logic ---
const widget = document.querySelector('.ai-coach-widget');
const toggleBtn = document.getElementById('toggle-coach');
const header = document.querySelector('.coach-header');
const msgContainer = document.getElementById('coach-messages');
const queryInput = document.getElementById('athlete-query');
const sendBtn = document.getElementById('send-query');

// REPLACEMENT WIDGET TOGGLE LOGIC
header.addEventListener('click', (e) => {
    // Ignore clicks if the user is typing in the box
    if (e.target.closest('#athlete-query') || e.target.closest('#send-query')) {
        return; 
    }
    
    // Toggle the class
    widget.classList.toggle('collapsed');
    
    // Swap the arrow icon perfectly
    if (widget.classList.contains('collapsed')) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    } else {
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    }
});

// Simulate AI responses based on keywords
const generateAIResponse = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('fatigue') || lowerText.includes('tired')) {
        return "Your kinetic model indicates high CNS load. I recommend substituting today's plyometrics with Zone 2 active recovery.";
    } else if (lowerText.includes('ready') || lowerText.includes('push')) {
        return "HRV is peaking at 78ms today. Your nervous system is primed for high-velocity output. Clear to execute heavy load.";
    } else {
        return "Analyzing current biometric sync... Based on your recent telemetry, maintain your current nutritional protocols and aim for 8.5 hours of sleep.";
    }
};

const handleSend = () => {
    const text = queryInput.value.trim();
    if(!text) return;
    
    // Add user message
    msgContainer.innerHTML += `<div class="message user-msg">${text}</div>`;
    queryInput.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;
    
    // Simulate "typing" delay
    setTimeout(() => {
        const response = generateAIResponse(text);
        msgContainer.innerHTML += `<div class="message ai-msg">${response}</div>`;
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 800);
};

sendBtn.addEventListener('click', handleSend);
queryInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') handleSend();
});

// Start widget in collapsed state for cleanliness
widget.classList.add('collapsed');


