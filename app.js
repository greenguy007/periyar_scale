// WebSocket connection
let ws = null;
let reconnectTimer = null;
let weightHistory = [];
let chart = null;

// Load saved server URL
const savedServer = localStorage.getItem('wsServer') || 'wss://periyar-scale-server.onrender.com/ws';
document.getElementById('wsServer').value = savedServer;

// Initialize chart
function initChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (grams)',
                data: [],
                borderColor: '#002366',
                backgroundColor: 'rgba(0, 35, 102, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weight (grams)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Connect to WebSocket
function connectWebSocket() {
    const serverUrl = document.getElementById('wsServer').value;
    
    if (!serverUrl) {
        showAlert('Please enter a WebSocket server URL', 'error');
        return;
    }

    // Save server URL
    localStorage.setItem('wsServer', serverUrl);

    try {
        ws = new WebSocket(serverUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            updateStatus(true);
            document.getElementById('serverInfo').textContent = `Server: ${serverUrl}`;
            showAlert('Connected to server successfully!', 'success');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            showAlert('Connection error. Check server URL and try again.', 'error');
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateStatus(false);
            
            if (document.getElementById('autoReconnect').checked) {
                showAlert('Disconnected. Reconnecting in 5 seconds...', 'error');
                reconnectTimer = setTimeout(() => {
                    connectWebSocket();
                }, 5000);
            }
        };
    } catch (err) {
        console.error('Error creating WebSocket:', err);
        showAlert('Failed to connect: ' + err.message, 'error');
    }
}

// Disconnect WebSocket
function disconnectWebSocket() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    
    if (ws) {
        ws.close();
        ws = null;
        updateStatus(false);
        showAlert('Disconnected from server', 'success');
    }
}

// Handle incoming messages
function handleMessage(message) {
    if (message.type === 'weight') {
        updateWeight(message.data);
    } else if (message.type === 'history') {
        loadHistory(message.data);
    }
}

// Update weight display
function updateWeight(data) {
    const grams = data.weight;
    const timestamp = new Date(data.timestamp);

    // Update main display
    let value, unit;
    if (grams >= 1000000) {
        value = (grams / 1000000).toFixed(3);
        unit = 'tons';
    } else if (grams >= 1000) {
        value = (grams / 1000).toFixed(3);
        unit = 'kg';
    } else {
        value = grams;
        unit = 'grams';
    }

    document.getElementById('weightValue').textContent = value;
    document.getElementById('weightUnit').textContent = unit;
    document.getElementById('weightLastUpdate').textContent = `Updated: ${timestamp.toLocaleTimeString()}`;
    document.getElementById('lastUpdate').textContent = `Last update: ${timestamp.toLocaleTimeString()}`;

    // Add to history
    addToHistory({
        weight: grams,
        timestamp: timestamp,
        datetime: timestamp.toISOString()
    });

    // Update stats
    updateStats();
}

// Add to history
function addToHistory(record) {
    weightHistory.unshift(record);
    
    // Keep only last 500 records in memory
    if (weightHistory.length > 500) {
        weightHistory = weightHistory.slice(0, 500);
    }

    // Update table
    updateHistoryTable();
    
    // Update chart (last 50 points)
    updateChart();
}

// Load history from server
function loadHistory(data) {
    weightHistory = data.map(item => ({
        weight: item.weight,
        timestamp: new Date(item.timestamp),
        datetime: item.datetime
    }));
    
    updateHistoryTable();
    updateChart();
    updateStats();
    
    showAlert(`Loaded ${data.length} historical records`, 'success');
}

// Update history table
function updateHistoryTable() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    if (weightHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No data yet</td></tr>';
        return;
    }

    // Show last 20 records
    const recentRecords = weightHistory.slice(0, 20);
    
    recentRecords.forEach(record => {
        const row = document.createElement('tr');
        
        let weightStr, unit;
        if (record.weight >= 1000000) {
            weightStr = (record.weight / 1000000).toFixed(3);
            unit = 'tons';
        } else if (record.weight >= 1000) {
            weightStr = (record.weight / 1000).toFixed(3);
            unit = 'kg';
        } else {
            weightStr = record.weight;
            unit = 'g';
        }
        
        row.innerHTML = `
            <td>${record.timestamp.toLocaleTimeString()}</td>
            <td>${weightStr}</td>
            <td>${unit}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update chart
function updateChart() {
    if (!chart) return;

    // Show last 50 points
    const recentData = weightHistory.slice(0, 50).reverse();
    
    const labels = recentData.map(r => r.timestamp.toLocaleTimeString());
    const data = recentData.map(r => r.weight);

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Update statistics
function updateStats() {
    if (weightHistory.length === 0) return;

    // Get today's records
    const today = new Date().toDateString();
    const todayRecords = weightHistory.filter(r => 
        r.timestamp.toDateString() === today
    );

    // Max weight
    const maxWeight = Math.max(...todayRecords.map(r => r.weight));
    let maxStr, maxUnit;
    if (maxWeight >= 1000000) {
        maxStr = (maxWeight / 1000000).toFixed(3);
        maxUnit = 'tons';
    } else if (maxWeight >= 1000) {
        maxStr = (maxWeight / 1000).toFixed(3);
        maxUnit = 'kg';
    } else {
        maxStr = maxWeight;
        maxUnit = 'g';
    }
    
    document.getElementById('maxWeight').textContent = `${maxStr} ${maxUnit}`;
    document.getElementById('readingCount').textContent = todayRecords.length;
}

// Update connection status
function updateStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

// Show alert
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        weightHistory = [];
        updateHistoryTable();
        updateChart();
        updateStats();
        showAlert('History cleared', 'success');
    }
}

// Export history
function exportHistory() {
    if (weightHistory.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }

    const csv = ['Time,Weight (grams),Timestamp'];
    
    weightHistory.forEach(record => {
        csv.push(`${record.timestamp.toLocaleString()},${record.weight},${record.datetime}`);
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `periyar-scale-${Date.now()}.csv`;
    a.click();
    
    showAlert('Data exported successfully!', 'success');
}

// Initialize on page load
window.addEventListener('load', () => {
    initChart();
    // Auto-connect if saved server exists
    if (savedServer) {
        connectWebSocket();
    }
});
