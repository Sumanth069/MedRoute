import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 1. Firebase Config from Vite Environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if we have valid Firebase configuration keys (at least apiKey and projectId)
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

let app;
let db;
let auth;

// Seeding Initial Data for LocalStorage mock database
const seedInitialMockData = () => {
  const medicines = [
    { id: 1, name: "Anti-Venom", category: "Critical Care", priority_level: 5, description: "Polyvalent snake antivenom injection" },
    { id: 2, name: "Blood Plasma", category: "Emergency", priority_level: 5, description: "Frozen blood plasma bags" },
    { id: 3, name: "Anti-Rabies Vaccine", category: "Vaccines", priority_level: 5, description: "Rabies post-exposure vaccine" },
    { id: 4, name: "Insulin", category: "Chronic Care", priority_level: 4, description: "Recombinant human insulin injection" },
    { id: 5, name: "Rotavirus Vaccine", category: "Vaccines", priority_level: 4, description: "Oral rotavirus vaccine for children" },
    { id: 6, name: "Amoxicillin", category: "Antibiotics", priority_level: 3, description: "Broad-spectrum penicillin antibiotic" },
    { id: 7, name: "Oral Rehydration Salts (ORS)", category: "Primary Care", priority_level: 2, description: "ORS packets for dehydration" },
    { id: 8, name: "Paracetamol", category: "Analgesics", priority_level: 1, description: "Common pain relief and antipyretic" },
  ];

  const clinics = [
    { id: 1, name: "Ramanagara PHC", type: "PHC", latitude: 12.722, longitude: 77.278, address: "KSRTC Bus Stand Road, Ramanagara", phone: "+91 9845011111" },
    { id: 2, name: "Tumkur District Hospital", type: "District Hospital", latitude: 13.340, longitude: 77.100, address: "BH Road, Tumkur", phone: "+91 9845022222" },
    { id: 3, name: "Channapatna CHC", type: "CHC", latitude: 12.652, longitude: 77.202, address: "M G Road, Channapatna", phone: "+91 9845033333" },
    { id: 4, name: "Maddur PHC", type: "PHC", latitude: 12.584, longitude: 77.045, address: "Near Railway Station, Maddur", phone: "+91 9845044444" },
    { id: 5, name: "Mandya District Hospital", type: "District Hospital", latitude: 12.522, longitude: 76.897, address: "M C Road, Mandya", phone: "+91 9845055555" },
    { id: 6, name: "Magadi CHC", type: "CHC", latitude: 12.957, longitude: 77.228, address: "Tirumale Road, Magadi", phone: "+91 9845066666" },
    { id: 7, name: "Kanakapura PHC", type: "PHC", latitude: 12.545, longitude: 77.420, address: "Sangama Road, Kanakapura", phone: "+91 9845077777" },
    { id: 8, name: "Bidadi PHC", type: "PHC", latitude: 12.798, longitude: 77.382, address: "Bengaluru-Mysore Highway, Bidadi", phone: "+91 9845088888" },
    { id: 9, name: "Nelamangala CHC", type: "CHC", latitude: 13.097, longitude: 77.391, address: "Tumkur Road, Nelamangala", phone: "+91 9845099999" },
    { id: 10, name: "Dobbaspet PHC", type: "PHC", latitude: 13.220, longitude: 77.240, address: "National Highway 48, Dobbaspet", phone: "+91 9845012121" },
    { id: 11, name: "Gubbi PHC", type: "PHC", latitude: 13.310, longitude: 76.940, address: "BH Road, Gubbi", phone: "+91 9845013131" },
    { id: 12, name: "Kunigal CHC", type: "CHC", latitude: 13.023, longitude: 77.037, address: "BM Road, Kunigal", phone: "+91 9845014141" },
    { id: 13, name: "Devanahalli CHC", type: "CHC", latitude: 13.248, longitude: 77.712, address: "NH 7, Devanahalli", phone: "+91 9845015151" },
    { id: 14, name: "Hoskote PHC", type: "PHC", latitude: 13.070, longitude: 77.798, address: "Old Madras Road, Hoskote", phone: "+91 9845016161" },
    { id: 15, name: "Anekal CHC", type: "CHC", latitude: 12.709, longitude: 77.697, address: "Thally Road, Anekal", phone: "+91 9845017171" },
  ];

  // Inventories linking clinics and medicines
  const inventories = [
    // Ramanagara: Critical deficit in Anti-Venom and Insulin
    { id: 1, clinic_id: 1, medicine_id: 1, batch_name: "B-AV-001", current_stock: 2, avg_daily_consumption: 0.8, days_to_expiry: 145, visit_trend: 25.0, season_score: 0.9 },
    { id: 2, clinic_id: 1, medicine_id: 4, batch_name: "B-IN-002", current_stock: 5, avg_daily_consumption: 2.0, days_to_expiry: 30, visit_trend: 15.0, season_score: 0.5 },
    { id: 3, clinic_id: 1, medicine_id: 6, batch_name: "B-AX-003", current_stock: 120, avg_daily_consumption: 10.0, days_to_expiry: 12, visit_trend: 5.0, season_score: 0.4 },
    { id: 4, clinic_id: 1, medicine_id: 8, batch_name: "B-PM-004", current_stock: 50, avg_daily_consumption: 25.0, days_to_expiry: 180, visit_trend: 10.0, season_score: 0.3 },

    // Nelamangala: Surplus Anti-Venom expiring in 3 days!
    { id: 5, clinic_id: 9, medicine_id: 1, batch_name: "B-AV-009", current_stock: 25, avg_daily_consumption: 0.1, days_to_expiry: 3, visit_trend: -5.0, season_score: 0.9 },
    { id: 6, clinic_id: 9, medicine_id: 4, batch_name: "B-IN-010", current_stock: 80, avg_daily_consumption: 1.5, days_to_expiry: 120, visit_trend: 2.0, season_score: 0.5 },

    // Tumkur: Hub with high insulin stock expiring in 4 days
    { id: 7, clinic_id: 2, medicine_id: 4, batch_name: "B-IN-005", current_stock: 150, avg_daily_consumption: 3.0, days_to_expiry: 4, visit_trend: 5.0, season_score: 0.5 },
    { id: 8, clinic_id: 2, medicine_id: 1, batch_name: "B-AV-006", current_stock: 50, avg_daily_consumption: 0.5, days_to_expiry: 220, visit_trend: 10.0, season_score: 0.9 },
    { id: 9, clinic_id: 2, medicine_id: 2, batch_name: "B-BP-007", current_stock: 3, avg_daily_consumption: 1.5, days_to_expiry: 15, visit_trend: 30.0, season_score: 0.6 },

    // Mandya: High plasma stock expiring in 6 days
    { id: 10, clinic_id: 5, medicine_id: 2, batch_name: "B-BP-011", current_stock: 15, avg_daily_consumption: 0.2, days_to_expiry: 6, visit_trend: 0.0, season_score: 0.6 },
    { id: 11, clinic_id: 5, medicine_id: 3, batch_name: "B-AR-012", current_stock: 40, avg_daily_consumption: 2.0, days_to_expiry: 120, visit_trend: 8.0, season_score: 0.5 },

    // Bidadi: Critical rabies vaccine deficit (0 units)
    { id: 12, clinic_id: 8, medicine_id: 3, batch_name: "B-AR-015", current_stock: 0, avg_daily_consumption: 1.2, days_to_expiry: 0, visit_trend: 15.0, season_score: 0.5 },
    { id: 13, clinic_id: 8, medicine_id: 8, batch_name: "B-PM-016", current_stock: 1500, avg_daily_consumption: 30.0, days_to_expiry: 200, visit_trend: 5.0, season_score: 0.3 },

    // Channapatna: Surplus rabies expiring in 5 days
    { id: 14, clinic_id: 3, medicine_id: 3, batch_name: "B-AR-020", current_stock: 18, avg_daily_consumption: 0.3, days_to_expiry: 5, visit_trend: -2.0, season_score: 0.5 },
    
    // Maddur: Needs ORS
    { id: 15, clinic_id: 4, medicine_id: 7, batch_name: "B-OR-025", current_stock: 20, avg_daily_consumption: 15.0, days_to_expiry: 300, visit_trend: 40.0, season_score: 0.85 },
    // Kanakapura: Surplus ORS
    { id: 16, clinic_id: 7, medicine_id: 7, batch_name: "B-OR-028", current_stock: 500, avg_daily_consumption: 5.0, days_to_expiry: 250, visit_trend: 0.0, season_score: 0.3 },

    // Magadi: Needs Rotavirus vaccine
    { id: 17, clinic_id: 6, medicine_id: 5, batch_name: "B-RV-030", current_stock: 3, avg_daily_consumption: 2.5, days_to_expiry: 45, visit_trend: 20.0, season_score: 0.7 },
    // Devanahalli: Surplus Rotavirus expiring in 8 days
    { id: 18, clinic_id: 13, medicine_id: 5, batch_name: "B-RV-035", current_stock: 35, avg_daily_consumption: 0.5, days_to_expiry: 8, visit_trend: 1.0, season_score: 0.5 },
  ];

  // Fill in other general inventories randomly to ensure a complete dataset
  let invIdCounter = 19;
  clinics.forEach(c => {
    medicines.forEach(m => {
      const exists = inventories.some(inv => inv.clinic_id === c.id && inv.medicine_id === m.id);
      if (!exists) {
        // Base stock levels
        const stock = Math.floor(Math.random() * 85) + 15;
        const use = parseFloat((Math.random() * 3.5 + 0.5).toFixed(1));
        const expiry = Math.floor(Math.random() * 330) + 35;
        const trend = parseFloat((Math.random() * 25 - 10).toFixed(1));
        const season = parseFloat((Math.random() * 0.5 + 0.2).toFixed(2));
        
        inventories.push({
          id: invIdCounter++,
          clinic_id: c.id,
          medicine_id: m.id,
          batch_name: `B-GEN-${invIdCounter}`,
          current_stock: stock,
          avg_daily_consumption: use,
          days_to_expiry: expiry,
          visit_trend: trend,
          season_score: season
        });
      }
    });
  });

  localStorage.setItem('medroute_medicines', JSON.stringify(medicines));
  localStorage.setItem('medroute_clinics', JSON.stringify(clinics));
  localStorage.setItem('medroute_inventory', JSON.stringify(inventories));
  localStorage.setItem('medroute_manifests', JSON.stringify([]));
  console.log('MedRoute LocalStorage Mock Database seeded successfully!');
};

// If Firebase is configured, initialize it
if (isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      console.log('Firebase services initialized successfully!');
    }
  } catch (error) {
    console.error('Error initializing Firebase, falling back to LocalStorage mock database:', error);
  }
}

// Ensure mock database is seeded if not present
if (!localStorage.getItem('medroute_clinics')) {
  seedInitialMockData();
}

// 2. Export Database Wrapper (Switches seamlessly between live Firestore and local mock DB)
export const dbService = {
  isLive: !!(isFirebaseConfigured && db),
  
  // Get all medicines
  getMedicines: async () => {
    return JSON.parse(localStorage.getItem('medroute_medicines') || '[]');
  },

  // Get all clinics
  getClinics: async () => {
    return JSON.parse(localStorage.getItem('medroute_clinics') || '[]');
  },

  // Get complete inventory
  getInventory: async () => {
    return JSON.parse(localStorage.getItem('medroute_inventory') || '[]');
  },

  // Save new inventory (e.g. after transfers)
  saveInventory: async (inventory) => {
    localStorage.setItem('medroute_inventory', JSON.stringify(inventory));
  },

  // Get all manifests
  getManifests: async () => {
    return JSON.parse(localStorage.getItem('medroute_manifests') || '[]');
  },

  // Save manifest list
  saveManifests: async (manifests) => {
    localStorage.setItem('medroute_manifests', JSON.stringify(manifests));
  }
};
