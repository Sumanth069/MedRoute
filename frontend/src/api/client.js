/**
 * MedRoute API Client
 * Integrates with FastAPI backend. Uses relative URLs proxying to port 8000 in development.
 */

export const api = {
  // Fetch brief details of all 15 clinics (status, location, counts)
  async getClinics() {
    const res = await fetch('/api/clinics');
    if (!res.ok) throw new Error('Failed to fetch clinics');
    return res.json();
  },

  // Fetch full details of a clinic including inventory and AI forecasting
  async getClinicDetail(id) {
    const res = await fetch(`/api/clinics/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch clinic details for ID: ${id}`);
    return res.json();
  },

  // Run Multi-Objective Optimization to generate recommended transfers
  async runOptimizer() {
    const res = await fetch('/api/optimizer/run', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run optimization engine');
    return res.json();
  },

  // Approve a recommendation and dispatch transfer manifest
  async createManifest(manifestData) {
    const res = await fetch('/api/manifests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifestData),
    });
    if (!res.ok) throw new Error('Failed to dispatch transfer manifest');
    return res.json();
  },

  // Fetch all transfer manifests
  async getManifests() {
    const res = await fetch('/api/manifests');
    if (!res.ok) throw new Error('Failed to fetch manifests');
    return res.json();
  },

  // Update a manifest's status (used by Driver PWA)
  async updateManifest(id, status, driverSignature = null) {
    const res = await fetch(`/api/manifests/${id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, driver_signature: driverSignature }),
    });
    if (!res.ok) throw new Error('Failed to update transfer status');
    return res.json();
  },

  // Fetch district-wide statistics & waste analytics
  async getStats() {
    const res = await fetch('/api/analytics/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Initialize WebSocket connection for live telemetry stock alerts
  connectAlerts(onMessage, onError, onClose) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in dev server, hot-reloads and proxies might route via host.
    // In Vite dev mode, we proxy '/ws' but for WS connection we should build correct URL.
    // If localhost:5173, proxy points to localhost:8000, so we connect to ws://localhost:8000/ws/alerts.
    // If not local host, use the active host.
    let wsHost = window.location.host;
    if (wsHost.includes('localhost:5173') || wsHost.includes('127.0.0.1:5173')) {
      wsHost = '127.0.0.1:8000';
    }
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws/alerts`;
    console.log(`Connecting to WebSocket Alert Stream at: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Error parsing WebSocket alert message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      if (onError) onError(error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket stream closed.', event);
      if (onClose) onClose(event);
    };

    return socket;
  }
};
