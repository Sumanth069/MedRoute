import { dbService } from './firebase';
import { forecaster } from './forecaster';
import { optimizer } from './optimizer';

export const api = {
  // Get all clinics, computing their counts and overall status on-the-fly
  async getClinics() {
    const [clinics, medicines, inventory] = await Promise.all([
      dbService.getClinics(),
      dbService.getMedicines(),
      dbService.getInventory()
    ]);

    return clinics.map(clinic => {
      let criticalCount = 0;
      let warningCount = 0;
      let surplusCount = 0;

      const clinicInventory = inventory.filter(inv => Number(inv.clinic_id) === Number(clinic.id));

      clinicInventory.forEach(inv => {
        const medicine = medicines.find(m => Number(m.id) === Number(inv.medicine_id));
        if (!medicine) return;

        const forecast = forecaster.predict(
          inv.current_stock,
          inv.avg_daily_consumption,
          inv.days_to_expiry,
          inv.season_score,
          inv.visit_trend,
          medicine.priority_level
        );

        if (inv.current_stock === 0 || (forecast.days_until_stockout <= 3.0 && medicine.priority_level >= 4)) {
          criticalCount++;
        } else if (forecast.days_until_stockout <= 7.0) {
          warningCount++;
        }

        if (inv.days_to_expiry <= 10 && inv.current_stock > 10) {
          surplusCount++;
        }
      });

      let status = 'stable';
      if (criticalCount > 0) {
        status = 'critical';
      } else if (warningCount > 0) {
        status = 'warning';
      }

      return {
        ...clinic,
        status,
        critical_count: criticalCount,
        warning_count: warningCount,
        surplus_count: surplusCount,
        total_items: clinicInventory.length
      };
    });
  },

  // Get clinic details including full inventories and SHAP AI forecasting
  async getClinicDetail(id) {
    const [clinics, medicines, inventory] = await Promise.all([
      dbService.getClinics(),
      dbService.getMedicines(),
      dbService.getInventory()
    ]);
    const clinic = clinics.find(c => Number(c.id) === Number(id));
    if (!clinic) throw new Error('Clinic not found');

    const clinicInventory = inventory.filter(inv => Number(inv.clinic_id) === Number(clinic.id));

    const inventoryDetails = clinicInventory.map(inv => {
      const medicine = medicines.find(m => Number(m.id) === Number(inv.medicine_id));
      
      const forecast = forecaster.predict(
        inv.current_stock,
        inv.avg_daily_consumption,
        inv.days_to_expiry,
        inv.season_score,
        inv.visit_trend,
        medicine ? medicine.priority_level : 1
      );

      return {
        id: inv.id,
        medicine_id: inv.medicine_id,
        medicine_name: medicine ? medicine.name : 'Unknown',
        medicine_category: medicine ? medicine.category : 'General',
        priority_level: medicine ? medicine.priority_level : 1,
        batch_name: inv.batch_name,
        current_stock: inv.current_stock,
        avg_daily_consumption: inv.avg_daily_consumption,
        days_to_expiry: inv.days_to_expiry,
        visit_trend: inv.visit_trend,
        season_score: inv.season_score,
        days_until_stockout: forecast.days_until_stockout,
        confidence: forecast.confidence,
        xai_reasons: forecast.xai_reasons
      };
    });

    // Sort priority
    inventoryDetails.sort((a, b) => b.priority_level - a.priority_level || a.days_until_stockout - b.days_until_stockout);

    return {
      ...clinic,
      inventory: inventoryDetails
    };
  },

  // Run Genetic Algorithm Optimizer on the client-side
  async runOptimizer() {
    const [clinics, medicines, inventory] = await Promise.all([
      dbService.getClinics(),
      dbService.getMedicines(),
      dbService.getInventory()
    ]);

    return optimizer.run(clinics, medicines, inventory);
  },

  // Create active transfer manifest (Approving route order)
  async createManifest(manifestData) {
    const inventory = await dbService.getInventory();
    const sourceInv = inventory.find(inv => 
      Number(inv.clinic_id) === Number(manifestData.source_clinic_id) && 
      Number(inv.medicine_id) === Number(manifestData.medicine_id)
    );

    if (!sourceInv || sourceInv.current_stock < manifestData.quantity) {
      throw new Error('Insufficient stock at source clinic');
    }

    // Deduct stock locally
    sourceInv.current_stock -= manifestData.quantity;
    await dbService.saveInventory(inventory);

    // Save new manifest
    const [manifests, medicines, clinics] = await Promise.all([
      dbService.getManifests(),
      dbService.getMedicines(),
      dbService.getClinics()
    ]);
    
    const med = medicines.find(m => Number(m.id) === Number(manifestData.medicine_id));
    const srcClinic = clinics.find(c => Number(c.id) === Number(manifestData.source_clinic_id));
    const destClinic = clinics.find(c => Number(c.id) === Number(manifestData.dest_clinic_id));

    const newManifest = {
      id: manifests.length + 1,
      source_clinic_name: srcClinic ? srcClinic.name : 'Source',
      dest_clinic_name: destClinic ? destClinic.name : 'Destination',
      medicine_name: med ? med.name : 'Medicine',
      medicine_priority: med ? med.priority_level : 1,
      quantity: manifestData.quantity,
      estimated_travel_time_mins: manifestData.estimated_travel_time_mins,
      distance_km: manifestData.distance_km,
      status: 'pending',
      driver_signature: null,
      created_at: new Date().toISOString()
    };

    manifests.push(newManifest);
    await dbService.saveManifests(manifests);

    // Trigger simulated event
    if (this._onAlertCallback) {
      this._onAlertCallback({
        type: 'manifest_created',
        message: `NEW MANIFEST: Driver dispatched to transfer ${manifestData.quantity} units of ${newManifest.medicine_name} from ${newManifest.source_clinic_name} to ${newManifest.dest_clinic_name}.`,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, manifest_id: newManifest.id, status: 'pending' };
  },

  // Get manifests
  async getManifests() {
    return dbService.getManifests();
  },

  // Update manifest status (start delivery, sign signature)
  async updateManifest(id, status, driverSignature = null, receivedQuantity = null) {
    const manifests = await dbService.getManifests();
    const manifestIndex = manifests.findIndex(m => Number(m.id) === Number(id));
    if (manifestIndex === -1) throw new Error('Manifest not found');

    const manifest = manifests[manifestIndex];
    manifest.status = status;
    if (driverSignature) {
      manifest.driver_signature = driverSignature;
    }

    if (receivedQuantity !== null && status === 'delivered') {
      const parsedQty = parseInt(receivedQuantity);
      manifest.received_quantity = parsedQty;
      manifest.has_discrepancy = parsedQty !== manifest.quantity;
    } else if (status === 'delivered') {
      manifest.received_quantity = manifest.quantity;
      manifest.has_discrepancy = false;
    }

    // If delivered, add stock to the recipient clinic
    if (status === 'delivered') {
      const clinics = await dbService.getClinics();
      const medicines = await dbService.getMedicines();
      const inventory = await dbService.getInventory();

      const destClinic = clinics.find(c => c.name === manifest.dest_clinic_name);
      const med = medicines.find(m => m.name === manifest.medicine_name);

      if (destClinic && med) {
        const destInv = inventory.find(inv => 
          Number(inv.clinic_id) === Number(destClinic.id) && 
          Number(inv.medicine_id) === Number(med.id)
        );

        const deliveredAmt = manifest.received_quantity !== undefined ? manifest.received_quantity : manifest.quantity;

        if (destInv) {
          destInv.current_stock += deliveredAmt;
        } else {
          inventory.push({
            id: inventory.length + 1,
            clinic_id: destClinic.id,
            medicine_id: med.id,
            batch_name: `B-TRANS-${manifest.id}`,
            current_stock: deliveredAmt,
            avg_daily_consumption: 1.0,
            days_to_expiry: 120,
            visit_trend: 0.0,
            season_score: 0.5
          });
        }
        await dbService.saveInventory(inventory);
      }
    }

    await dbService.saveManifests(manifests);

    // Trigger simulated event
    if (this._onAlertCallback) {
      const discrepancyText = manifest.has_discrepancy 
        ? ` WITH DISCREPANCY (expected ${manifest.quantity}, got ${manifest.received_quantity})`
        : '';
      this._onAlertCallback({
        type: 'manifest_updated',
        manifest_id: manifest.id,
        status: status,
        message: `ROUTE UPDATE: Manifest #${manifest.id} is now ${status.toUpperCase()}${discrepancyText}.`,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, status: manifest.status };
  },

  // Pharmacist verification audit
  async auditInventory(clinicId, medicineId, actualCount) {
    const inventory = await dbService.getInventory();
    const invItem = inventory.find(inv => 
      Number(inv.clinic_id) === Number(clinicId) && 
      Number(inv.medicine_id) === Number(medicineId)
    );
    if (!invItem) throw new Error('Inventory record not found');
    
    const oldCount = invItem.current_stock;
    invItem.current_stock = parseInt(actualCount);
    
    await dbService.saveInventory(inventory);
    
    // Trigger alert
    if (this._onAlertCallback) {
      this._onAlertCallback({
        type: 'audit_verified',
        message: `AUDIT VERIFIED: PHC Pharmacist audited stock for item. Count adjusted from ${oldCount} to ${actualCount} units.`,
        timestamp: new Date().toISOString()
      });
    }
    
    return { success: true, old_count: oldCount, new_count: invItem.current_stock };
  },

  // Request auto-transfer from nearby surplus
  async requestAutoRequisition(clinicId, medicineId) {
    const [clinics, inventory, medicines] = await Promise.all([
      dbService.getClinics(),
      dbService.getInventory(),
      dbService.getMedicines()
    ]);
    
    const targetMed = medicines.find(m => Number(m.id) === Number(medicineId));
    const targetClinic = clinics.find(c => Number(c.id) === Number(clinicId));
    
    if (!targetMed || !targetClinic) throw new Error('Invalid clinic or medicine');
    
    // Find a clinic with surplus
    let bestSource = null;
    let maxSurplus = -1;
    
    inventory.forEach(inv => {
      if (Number(inv.medicine_id) === Number(medicineId) && Number(inv.clinic_id) !== Number(clinicId)) {
        if (inv.current_stock > 30 && inv.current_stock > maxSurplus) {
          maxSurplus = inv.current_stock;
          bestSource = inv;
        }
      }
    });
    
    if (!bestSource) {
      throw new Error('No surplus source available in the district for this medicine');
    }
    
    const sourceClinic = clinics.find(c => Number(c.id) === Number(bestSource.clinic_id));
    
    // Create a manifest transferring 15 units (or less if source has limit)
    const transferQty = Math.min(20, Math.floor(bestSource.current_stock / 2));
    
    const manifestResult = await this.createManifest({
      source_clinic_id: sourceClinic.id,
      dest_clinic_id: clinicId,
      medicine_id: medicineId,
      quantity: transferQty,
      estimated_travel_time_mins: 35,
      distance_km: 18.2
    });
    
    // Trigger alert
    if (this._onAlertCallback) {
      this._onAlertCallback({
        type: 'requisition_triggered',
        message: `AUTO-REQUISITION: PHC ${targetClinic.name} requested transfer of ${transferQty} units of ${targetMed.name} from surplus PHC ${sourceClinic.name}.`,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      source_clinic_name: sourceClinic.name,
      quantity: transferQty,
      medicine_name: targetMed.name
    };
  },

  // Get statistics
  async getStats() {
    const manifests = await dbService.getManifests();
    const inventory = await dbService.getInventory();
    const medicines = await dbService.getMedicines();

    const medCosts = {
      "Anti-Venom": 1500,
      "Blood Plasma": 2500,
      "Anti-Rabies Vaccine": 800,
      "Insulin": 450,
      "Rotavirus Vaccine": 300,
      "Amoxicillin": 150,
      "Oral Rehydration Salts (ORS)": 20,
      "Paracetamol": 10
    };

    let totalItemsSaved = 0;
    let totalWastePreventedRs = 0;
    let activeDeliveries = 0;
    let completedDeliveries = 0;

    manifests.forEach(m => {
      const cost = medCosts[m.medicine_name] || 50;
      if (m.status === 'in_transit' || m.status === 'delivered') {
        totalItemsSaved += m.quantity;
        totalWastePreventedRs += m.quantity * cost;
      }

      if (m.status === 'delivered') {
        completedDeliveries++;
      } else {
        activeDeliveries++;
      }
    });

    const zeroStockItems = inventory.filter(inv => inv.current_stock === 0).length;

    // Safety horizon average
    let totalHorizon = 0;
    inventory.forEach(inv => {
      const med = medicines.find(m => Number(m.id) === Number(inv.medicine_id));
      const forecast = forecaster.predict(
        inv.current_stock,
        inv.avg_daily_consumption,
        inv.days_to_expiry,
        inv.season_score,
        inv.visit_trend,
        med ? med.priority_level : 1
      );
      totalHorizon += forecast.days_until_stockout;
    });
    const avgHorizon = inventory.length ? parseFloat((totalHorizon / inventory.length).toFixed(1)) : 14.5;

    return {
      total_items_saved: totalItemsSaved,
      total_waste_prevented_rs: totalWastePreventedRs,
      active_deliveries: activeDeliveries,
      completed_deliveries: completedDeliveries,
      district_stockouts: zeroStockItems,
      average_safety_horizon_days: avgHorizon
    };
  },

  // Simulated Telemetry WebSocket / Firestore Event Streams
  connectAlerts(onMessage, onError, onClose) {
    this._onAlertCallback = onMessage;

    // Generate a random alert every 12 seconds to simulate telemetry traffic
    const interval = setInterval(async () => {
      try {
        const inventory = await dbService.getInventory();
        const clinics = await dbService.getClinics();
        const medicines = await dbService.getMedicines();

        const alerts = [];
        
        inventory.forEach(inv => {
          const clinic = clinics.find(c => Number(c.id) === Number(inv.clinic_id));
          const medicine = medicines.find(m => Number(m.id) === Number(inv.medicine_id));
          if (!clinic || !medicine) return;

          const forecast = forecaster.predict(
            inv.current_stock,
            inv.avg_daily_consumption,
            inv.days_to_expiry,
            inv.season_score,
            inv.visit_trend,
            medicine.priority_level
          );

          if (inv.current_stock === 0) {
            alerts.push({
              type: 'critical',
              clinic_name: clinic.name,
              medicine_name: medicine.name,
              priority: medicine.priority_level,
              message: `STOCKOUT ALERT: ${clinic.name} is completely out of ${medicine.name}!`
            });
          } else if (forecast.days_until_stockout <= 3.0 && medicine.priority_level >= 4) {
            alerts.push({
              type: 'critical',
              clinic_name: clinic.name,
              medicine_name: medicine.name,
              priority: medicine.priority_level,
              message: `CRITICAL STOCKOUT: ${clinic.name} faces stockout of ${medicine.name} in ${forecast.days_until_stockout} days.`
            });
          } else if (forecast.days_until_stockout <= 5.0 && medicine.priority_level >= 3) {
            alerts.push({
              type: 'warning',
              clinic_name: clinic.name,
              medicine_name: medicine.name,
              priority: medicine.priority_level,
              message: `WARNING: ${clinic.name} inventory for ${medicine.name} dropping. Stockout in ${forecast.days_until_stockout} days.`
            });
          }

          if (inv.days_to_expiry <= 5 && inv.current_stock > 10) {
            alerts.push({
              type: 'expiry',
              clinic_name: clinic.name,
              medicine_name: medicine.name,
              priority: medicine.priority_level,
              message: `EXPIRY ALERT: ${clinic.name} has ${inv.current_stock} units of ${medicine.name} expiring in ${inv.days_to_expiry} days!`
            });
          }
        });

        if (alerts.length > 0) {
          const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
          onMessage({
            ...randomAlert,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Error generating telemetry alerts:', err);
      }
    }, 12000);

    return {
      close: () => {
        clearInterval(interval);
        this._onAlertCallback = null;
        if (onClose) onClose();
      }
    };
  }
};
