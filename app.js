// WebSocket connection
let ws = null;
let reconnectInterval = null;
let isConnecting = false;

// Load saved server URL
const savedServer = localStorage.getItem('wsServer') || 'wss://periyar-scale-server.onrender.com/ws';
document.getElementById('wsServer').value = savedServer;

// Data storage
let weightData = {
    timestamps: [],
    weights: [],
    current: 0,
    unit: 'kg',
    max: 0,
    min: Infinity,
    avg: 0,
    count: 0
};

let maxDataPoints = 100;
let chart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    setupEventListeners();
    loadSettings();
    addLog('System initialized and ready', 'info');
});

function setupEventListeners() {
    document.getElementById('connectBtn').addEventListener('click', connect);
    document.getElementById('disconnectBtn').addEventListener('click', disconnect);
    document.getElementById('clearDataBtn').addEventListener('click', clearData);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
    document.getElementById('maxDataPoints').addEventListener('change', (e) => {
        maxDataPoints = parseInt(e.target.value);
        localStorage.setItem('maxDataPoints', maxDataPoints);
        addLog(\Data points limit changed to \\, 'info');
    });
    document.getElementById('wsServer').addEventListener('change', (e) => {
        localStorage.setItem('wsServer', e.target.value);
        addLog('WebSocket server URL updated', 'info');
    });
}

function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        addLog('Already connected to server', 'warning');
        return;
    }
    if (isConnecting) {
        addLog('Connection already in progress', 'warning');
        return;
    }
    const serverUrl = document.getElementById('wsServer').value.trim();
    if (!serverUrl) {
        addLog('Please enter a valid WebSocket server URL', 'error');
        return;
    }
    isConnecting = true;
    updateConnectionStatus('connecting', 'Connecting...');
    addLog(\Connecting to \\, 'info');
    try {
        ws = new WebSocket(serverUrl);
        ws.onopen = () => {
            isConnecting = false;
            updateConnectionStatus('connected', 'Connected');
            addLog('Successfully connected to WebSocket server', 'success');
            document.getElementById('connectBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = false;
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWeightData(data);
            } catch (error) {
                console.error('Error parsing message:', error);
                addLog('Error parsing received data', 'error');
            }
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addLog('WebSocket connection error', 'error');
            isConnecting = false;
        };
        ws.onclose = () => {
            isConnecting = false;
            updateConnectionStatus('disconnected', 'Disconnected');
            addLog('WebSocket connection closed', 'warning');
            document.getElementById('connectBtn').disabled = false;
            document.getElementById('disconnectBtn').disabled = true;
            if (!reconnectInterval) {
                reconnectInterval = setTimeout(() => {
                    addLog('Attempting to reconnect...', 'info');
                    reconnectInterval = null;
                    connect();
                }, 5000);
            }
        };
    } catch (error) {
        isConnecting = false;
        console.error('Connection error:', error);
        addLog(\Failed to connect: \\, 'error');
        updateConnectionStatus('disconnected', 'Disconnected');
    }
}

function disconnect() {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
    if (ws) {
        ws.close();
        ws = null;
        addLog('Manually disconnected from server', 'info');
    }
    updateConnectionStatus('disconnected', 'Disconnected');
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
}

function handleWeightData(data) {
    const weight = parseFloat(data.weight) || 0;
    const unit = data.unit || 'kg';
    const timestamp = data.timestamp || Date.now();
    weightData.current = weight;
    weightData.unit = unit;
    weightData.count++;
    if (weight > weightData.max) weightData.max = weight;
    if (weight < weightData.min) weightData.min = weight;
    weightData.timestamps.push(new Date(timestamp));
    weightData.weights.push(weight);
    if (weightData.timestamps.length > maxDataPoints) {
        weightData.timestamps.shift();
        weightData.weights.shift();
    }
    const sum = weightData.weights.reduce((a, b) => a + b, 0);
    weightData.avg = weightData.weights.length > 0 ? sum / weightData.weights.length : 0;
    updateDisplay();
    updateChart();
    addLog(\Weight reading: \ \\, 'success');
}

function updateDisplay() {
    document.getElementById('currentWeight').textContent = weightData.current.toFixed(2);
    document.getElementById('weightUnit').textContent = weightData.unit;
    const now = new Date();
    document.getElementById('lastUpdate').textContent = \Last updated: \\;
    document.getElementById('maxWeight').textContent = weightData.max === 0 ? '0.00' : weightData.max.toFixed(2);
    document.getElementById('minWeight').textContent = weightData.min === Infinity ? '0.00' : weightData.min.toFixed(2);
    document.getElementById('avgWeight').textContent = weightData.avg.toFixed(2);
    document.getElementById('dataPoints').textContent = weightData.count.toLocaleString();
}

function initializeChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (kg)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return \Weight: \ kg\;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { maxRotation: 45, minRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2) + ' kg';
                        }
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function updateChart() {
    if (!chart) return;
    const labels = weightData.timestamps.map(ts => {
        const date = new Date(ts);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    });
    chart.data.labels = labels;
    chart.data.datasets[0].data = weightData.weights;
    chart.update('none');
}

function updateConnectionStatus(status, text) {
    const badge = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    badge.className = \status-badge \\;
    statusText.textContent = text;
}

function addLog(message, type = 'info') {
    const log = document.getElementById('activityLog');
    const item = document.createElement('div');
    item.className = \ctivity-item \\;
    const icons = {
        info: 'fa-circle-info',
        success: 'fa-circle-check',
        warning: 'fa-triangle-exclamation',
        error: 'fa-circle-xmark'
    };
    item.innerHTML = \
        <div class="activity-icon">
            <i class="fas \"></i>
        </div>
        <div class="activity-content">
            <div class="activity-message">\</div>
            <div class="activity-time">\</div>
        </div>
    \;
    log.insertBefore(item, log.firstChild);
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

function clearLog() {
    const log = document.getElementById('activityLog');
    log.innerHTML = '';
    addLog('Activity log cleared', 'info');
}

function clearData() {
    if (confirm('Are you sure you want to clear all weight data?')) {
        weightData = {
            timestamps: [],
            weights: [],
            current: 0,
            unit: 'kg',
            max: 0,
            min: Infinity,
            avg: 0,
            count: 0
        };
        updateDisplay();
        updateChart();
        addLog('All weight data cleared', 'warning');
    }
}

function exportData() {
    if (weightData.timestamps.length === 0) {
        addLog('No data to export', 'warning');
        return;
    }
    let csv = 'Timestamp,Weight (kg)\n';
    for (let i = 0; i < weightData.timestamps.length; i++) {
        const timestamp = weightData.timestamps[i].toISOString();
        const weight = weightData.weights[i].toFixed(2);
        csv += \\,\\n\;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \periyar-scale-data-\.csv\;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    addLog(\Exported \ data points to CSV\, 'success');
}

function loadSettings() {
    const savedMax = localStorage.getItem('maxDataPoints');
    if (savedMax) {
        maxDataPoints = parseInt(savedMax);
        document.getElementById('maxDataPoints').value = maxDataPoints;
    }
}

function formatTime(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
