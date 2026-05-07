const ambulanceService = require('../services/ambulanceService');
const routingService = require('../services/routingService');

/**
 * Initialize Socket.io event handlers
 */
function initializeSocketHandler(io) {
  const connectedClients = new Map();

  io.on('connection', (socket) => {
    const clientId = socket.id;
    console.log(`✓ Client connected: ${clientId}`);

    connectedClients.set(clientId, {
      id: clientId,
      connectedAt: new Date(),
      subscriptions: []
    });

    /**
     * Subscribe to ambulance updates
     */
    socket.on('subscribe_ambulance', (ambulanceId) => {
      const room = `ambulance_${ambulanceId}`;
      socket.join(room);

      const client = connectedClients.get(clientId);
      if (client && !client.subscriptions.includes(room)) {
        client.subscriptions.push(room);
      }

      console.log(`[Socket] Client ${clientId} subscribed to ambulance ${ambulanceId}`);

      socket.emit('subscription_confirmed', {
        type: 'ambulance',
        id: ambulanceId,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * Unsubscribe from ambulance updates
     */
    socket.on('unsubscribe_ambulance', (ambulanceId) => {
      const room = `ambulance_${ambulanceId}`;
      socket.leave(room);

      const client = connectedClients.get(clientId);
      if (client) {
        client.subscriptions = client.subscriptions.filter(s => s !== room);
      }

      console.log(`[Socket] Client ${clientId} unsubscribed from ambulance ${ambulanceId}`);
    });

    /**
     * Subscribe to all events
     */
    socket.on('subscribe_all', () => {
      socket.join('all_updates');

      const client = connectedClients.get(clientId);
      if (client && !client.subscriptions.includes('all_updates')) {
        client.subscriptions.push('all_updates');
      }

      console.log(`[Socket] Client ${clientId} subscribed to all updates`);

      socket.emit('subscription_confirmed', {
        type: 'all',
        timestamp: new Date().toISOString()
      });
    });

    /**
     * Request ambulance status
     */
    socket.on('get_ambulance_status', async (ambulanceId, callback) => {
      try {
        const ambulance = await ambulanceService.getAmbulanceById(ambulanceId);
        if (callback) {
          callback({ success: true, data: ambulance });
        }
      } catch (err) {
        console.error('[Socket] Error fetching ambulance status:', err.message);
        if (callback) {
          callback({ success: false, error: err.message });
        }
      }
    });

    /**
     * Request all ambulances
     */
    socket.on('get_all_ambulances', async (callback) => {
      try {
        const ambulances = await ambulanceService.getAllAmbulances();
        if (callback) {
          callback({ success: true, data: ambulances });
        }
      } catch (err) {
        console.error('[Socket] Error fetching ambulances:', err.message);
        if (callback) {
          callback({ success: false, error: err.message });
        }
      }
    });

    /**
     * Acknowledge location update from client
     */
    socket.on('location_update_ack', (data) => {
      console.log(`[Socket] Location update acknowledged for ambulance ${data.ambulance_id}`);
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error(`[Socket] Client ${clientId} error:`, error);
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      const client = connectedClients.get(clientId);
      if (client) {
        console.log(`✗ Client disconnected: ${clientId} (was connected for ${Math.round((Date.now() - new Date(client.connectedAt).getTime()) / 1000)}s)`);
        connectedClients.delete(clientId);
      }
    });
  });

  // Broadcast helper functions
  const broadcastHelpers = {
    /**
     * Emit ambulance location update to all listeners
     */
    broadcastAmbulanceLocation: (ambulanceId, locationData) => {
      io.to(`ambulance_${ambulanceId}`).emit('ambulance_location_update', {
        ambulance_id: ambulanceId,
        ...locationData,
        timestamp: new Date().toISOString()
      });

      io.to('all_updates').emit('ambulance_location_update', {
        ambulance_id: ambulanceId,
        ...locationData,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Emit incident to all listeners
     */
    broadcastIncident: (incident) => {
      io.emit('incident_added', {
        incident: incident,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Emit route update
     */
    broadcastRouteUpdate: (ambulanceId, route, trigger = 'manual') => {
      io.to(`ambulance_${ambulanceId}`).emit('route_updated', {
        ambulance_id: ambulanceId,
        route: route,
        trigger: trigger,
        timestamp: new Date().toISOString()
      });

      io.to('all_updates').emit('route_updated', {
        ambulance_id: ambulanceId,
        route: route,
        trigger: trigger,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Emit police update
     */
    broadcastPoliceUpdate: (update) => {
      io.emit('police_update', {
        update: update,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Emit ambulance status change
     */
    broadcastStatusChange: (ambulanceId, newStatus) => {
      io.to(`ambulance_${ambulanceId}`).emit('ambulance_status_changed', {
        ambulance_id: ambulanceId,
        status: newStatus,
        timestamp: new Date().toISOString()
      });

      io.to('all_updates').emit('ambulance_status_changed', {
        ambulance_id: ambulanceId,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Get connection stats
     */
    getStats: () => ({
      connectedClients: connectedClients.size,
      totalSubscriptions: Array.from(connectedClients.values()).reduce(
        (sum, client) => sum + client.subscriptions.length,
        0
      ),
      clients: Array.from(connectedClients.values()).map(client => ({
        id: client.id,
        subscriptions: client.subscriptions,
        connectedDuration: Math.round((Date.now() - new Date(client.connectedAt).getTime()) / 1000)
      }))
    })
  };

  return broadcastHelpers;
}

module.exports = initializeSocketHandler;
