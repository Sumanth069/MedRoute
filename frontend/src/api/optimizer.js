import { forecaster } from './forecaster';

// Haversine formula to compute distance between two lat/lng coordinates in km
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in kilometers
  
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dlon / 2) * Math.sin(dlon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export const optimizer = {
  // Optimization weights
  w_priority: 45.0,
  w_expiry: 65.0,
  w_distance: 1.5,

  run(clinics, medicines, inventory) {
    const deficits = [];
    const surpluses = [];

    // 1. Identify deficits and surpluses
    inventory.forEach(inv => {
      const clinic = clinics.find(c => c.id === inv.clinic_id);
      const medicine = medicines.find(m => m.id === inv.medicine_id);
      
      if (!clinic || !medicine) return;

      const forecast = forecaster.predict(
        inv.current_stock,
        inv.avg_daily_consumption,
        inv.days_to_expiry,
        inv.season_score,
        inv.visit_trend,
        medicine.priority_level
      );

      const effectiveConsumption = Math.max(0.1, inv.avg_daily_consumption * (1.0 + inv.visit_trend/100.0) * (1.0 + inv.season_score*0.4));

      // Deficit Check: stockout in <= 7 days or stock is 0
      if (forecast.days_until_stockout <= 7.0 || inv.current_stock === 0) {
        const needed = Math.ceil(effectiveConsumption * 14) - inv.current_stock;
        deficits.push({
          inventory_id: inv.id,
          clinic,
          medicine,
          current_stock: inv.current_stock,
          needed_stock: Math.max(5, needed),
          days_until_stockout: forecast.days_until_stockout
        });
      }
      
      // Surplus Check: expiring soon (<= 15d) or holds > 30d supply
      else if (inv.days_to_expiry <= 15 || inv.current_stock > (effectiveConsumption * 30)) {
        const reserve = Math.ceil(effectiveConsumption * 15);
        let donation = inv.current_stock - reserve;
        
        if (inv.days_to_expiry <= 10) {
          donation = inv.current_stock; // Donate all to prevent waste if expiring
        }

        if (donation > 5) {
          surpluses.push({
            inventory_id: inv.id,
            clinic,
            medicine,
            current_stock: inv.current_stock,
            days_to_expiry: inv.days_to_expiry,
            available_donation: donation
          });
        }
      }
    });

    if (deficits.length === 0 || surpluses.length === 0) {
      return [];
    }

    // 2. Identify potential transfer matches (same medicine, different clinics)
    const matches = [];
    surpluses.forEach((surp, sIdx) => {
      deficits.forEach((defc, dIdx) => {
        if (surp.medicine.id === defc.medicine.id && surp.clinic.id !== defc.clinic.id) {
          matches.push({ sIdx, dIdx });
        }
      });
    });

    if (matches.length === 0) {
      return [];
    }

    // 3. Genetic Algorithm logic
    const populationSize = 40;
    const generations = 30;
    let population = [];

    // Evaluate chromosome utility
    const evaluate = (chrom) => {
      if (chrom.length === 0) return 0.0;
      
      let score = 0.0;
      const usedSurplus = {};
      const usedDeficit = {};

      for (const gene of chrom) {
        const surp = surpluses[gene.sIdx];
        const defc = deficits[gene.dIdx];

        if (surp.medicine.id !== defc.medicine.id) return -9999.0;
        if (surp.clinic.id === defc.clinic.id) return -9999.0;

        const sKey = surp.inventory_id;
        const alreadyDonated = usedSurplus[sKey] || 0;
        if (alreadyDonated + gene.qty > surp.available_donation) {
          score -= 300.0; // Penalty
        }

        const dist = calculateHaversineDistance(
          surp.clinic.latitude, surp.clinic.longitude,
          defc.clinic.latitude, defc.clinic.longitude
        );

        // Core utility weights
        const priorityBenefit = defc.medicine.priority_level * optimizer.w_priority;
        const expiryBenefit = (100.0 / Math.max(1.0, surp.days_to_expiry)) * optimizer.w_expiry;
        const distPenalty = dist * optimizer.w_distance;
        
        const dKey = defc.inventory_id;
        const alreadyReceived = usedDeficit[dKey] || 0;
        const percentFulfilled = Math.min(1.0, (alreadyReceived + gene.qty) / defc.needed_stock);
        const fulfillmentBonus = percentFulfilled * 100.0;

        score += (priorityBenefit + expiryBenefit + fulfillmentBonus - distPenalty);
        
        usedSurplus[sKey] = alreadyDonated + gene.qty;
        usedDeficit[dKey] = alreadyReceived + gene.qty;
      }

      return score;
    };

    // Initialize random population
    for (let p = 0; p < populationSize; p++) {
      const chrom = [];
      const len = Math.floor(Math.random() * Math.min(6, matches.length)) + 1;
      const sampledMatches = matches.sort(() => 0.5 - Math.random()).slice(0, len);
      
      sampledMatches.forEach(m => {
        const surp = surpluses[m.sIdx];
        const defc = deficits[m.dIdx];
        const qty = Math.floor(Math.random() * (Math.min(surp.available_donation, defc.needed_stock) - 5)) + 5;
        chrom.push({ sIdx: m.sIdx, dIdx: m.dIdx, qty });
      });
      population.push(chrom);
    }

    // Evolution loop
    for (let gen = 0; gen < generations; gen++) {
      const scored = population.map(chrom => ({ chrom, score: evaluate(chrom) }));
      scored.sort((a, b) => b.score - a.score);

      // Keep top 20% elites
      const eliteSize = Math.floor(populationSize * 0.2);
      const nextGen = scored.slice(0, eliteSize).map(x => x.chrom);

      while (nextGen.length < populationSize) {
        // Selection via Tournament
        const select = () => {
          const sample = [
            scored[Math.floor(Math.random() * populationSize)],
            scored[Math.floor(Math.random() * populationSize)],
            scored[Math.floor(Math.random() * populationSize)]
          ];
          sample.sort((a, b) => b.score - a.score);
          return sample[0].chrom;
        };

        const p1 = select();
        const p2 = select();
        
        // Single-point Crossover
        let child = [];
        if (p1.length > 1 && p2.length > 1 && Math.random() < 0.8) {
          const cut = Math.floor(Math.random() * (Math.min(p1.length, p2.length) - 1)) + 1;
          child = p1.slice(0, cut).concat(p2.slice(cut));
        } else {
          child = [...p1];
        }

        // Mutation
        if (Math.random() < 0.3 && child.length > 0) {
          const mIdx = Math.floor(Math.random() * child.length);
          const gene = child[mIdx];
          const surp = surpluses[gene.sIdx];
          const defc = deficits[gene.dIdx];
          gene.qty = Math.floor(Math.random() * (Math.min(surp.available_donation, defc.needed_stock) - 5)) + 5;
        }

        nextGen.push(child);
      }

      population = nextGen;
    }

    // Evaluate final and return the best
    const finalScored = population.map(chrom => ({ chrom, score: evaluate(chrom) }));
    finalScored.sort((a, b) => b.score - a.score);
    const bestChrom = finalScored[0].chrom;

    // 4. Format the GA results
    const recommendations = [];
    bestChrom.forEach(gene => {
      const surp = surpluses[gene.sIdx];
      const defc = deficits[gene.dIdx];

      const dist = calculateHaversineDistance(
        surp.clinic.latitude, surp.clinic.longitude,
        defc.clinic.latitude, defc.clinic.longitude
      );

      const travelTime = Math.round(dist * 1.4 + 10); // mins

      // Budget waste cost
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
      const costPerUnit = medCosts[surp.medicine.name] || 50;
      const wasteSaved = surp.days_to_expiry <= 10 ? gene.qty * costPerUnit : 0;

      recommendations.push({
        source_clinic_id: surp.clinic.id,
        source_clinic_name: surp.clinic.name,
        dest_clinic_id: defc.clinic.id,
        dest_clinic_name: defc.clinic.name,
        medicine_id: surp.medicine.id,
        medicine_name: surp.medicine.name,
        medicine_priority: surp.medicine.priority_level,
        quantity: gene.qty,
        distance_km: dist,
        estimated_travel_time_mins: travelTime,
        waste_saved_rs: wasteSaved,
        surplus_days_to_expiry: surp.days_to_expiry
      });
    });

    // Sort priority
    recommendations.sort((a, b) => b.medicine_priority - a.medicine_priority);
    return recommendations;
  }
};
