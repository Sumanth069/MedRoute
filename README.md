# 🚀 MedRoute: Intelligent Vaccine & Drug Logistics Command Center

MedRoute is a serverless, progressive digital health command console designed to optimize drug inventory levels, eliminate vaccine wastage, and automate emergency supply chain redistribution across rural health clinic networks.

---

## 💡 The Core Problem & MedRoute's Solution

In rural healthcare systems, primary health clinics (PHCs) operate in isolation. This causes a dual supply chain failure: **acute stockouts** of critical medicines (e.g. anti-venom, rabies vaccines) in some clinics, while **massive surpluses expire** on the shelves of nearby facilities.

### 📋 Problem-Solution Matrix

| Rural Health Logistics Challenge | Traditional Manual Logistics | MedRoute's Digital AI Solution |
| :--- | :--- | :--- |
| **Delayed Requisitions & Stockouts** | Clinics call or paper-indent *after* a stockout occurs. Administrative approvals take days. | **Auto-Requisition Matching**: Predicts stockout horizons and automatically dispatches transfers 10 days in advance. |
| **Digit-Swapping Transcription Typos** | Clinic inventory ledgers are written manually, leading to transposed numbers (e.g. logging 59 instead of 95). | **Smart Audit Verification**: Flags transposed digit anomalies and scrambled inputs on-the-fly to secure database accuracy. |
| **High Vaccine Shelflife Wastage** | Batches expire unnoticed because older inventories are not actively prioritized or rotated. | **Multi-Objective Routing**: Genetic optimization ranks dispatch priorities based on batch expiration dates and item value. |
| **Uncoordinated Delivery Runs** | Drivers deliver supplies on unoptimized, ad-hoc routes, increasing transport delay times. | **Evolutionary Path Optimization**: Evolving route planning to minimize total travel time and fuel consumption. |

---

## 🎨 System Capabilities by User Persona

MedRoute is designed as a unified system composed of three stateful consoles:

### 1. 🏢 District Health Officer (DHO) Command Console
* **Interactive Spatiotemporal Mapping**: Real-time visualization of Karnataka's Ramanagara district clinics using CartoDB Positron maps and color-coded status pins (Stable, Warning, Critical).
* **AI Routing Solver Progress Panel**: Displays real-time parameters of the Genetic Algorithm (GA) optimizer, including crossover rates, adaptive mutations, and live fitness score improvements.
* **Auto-Generated Manifest Cards**: Shows the exact amount, source clinic, destination clinic, travel time, and value saved for each recommended transfer.

### 2. 🏥 Primary Health Center (PHC) Pharmacist Console
* **Sync Status Indicator**: Real-time gateway status indicating network connectivity and database synchronization.
* **Smart Physical Audit Form**: Features automated digit-swapping checks to detect common human typos (e.g., alert triggers when entering `59` when the system expects `95`).
* **Auto-Requisition Dispatcher**: Detects stock shortages below the 10-day safety limit, automatically matches the best surplus clinic, and generates a driver dispatch route.

### 3. 🚚 Mobile Dispatcher App (Driver Utility)
* **Intake Verification Safeguard**: Drivers must count and enter the actual physical quantity received rather than blind-confirming deliveries.
* **Discrepancy Flags**: Instantly compares the actual received quantity vs the manifest target, automatically logging discrepancies to the central registry.
* **Digital Signatures**: Canvas-drawn digital signature verification before updating database records.

---

## 🛠️ Technology Stack & AI Architecture

1. **Frontend Core**: React 18, Vite, Vanilla CSS glassmorphic tokens, and Lucide React.
2. **Interactive Maps**: React Leaflet mapping with customized CSS `L.divIcon` containers to prevent Vite bundling hashes from breaking map assets in production.
3. **Database Integration**: Cloud Firestore (live sync) with a stateful `localStorage` seeder fallback (ensures the app runs fully functional out-of-the-box on Vercel).
4. **AI Demand Forecaster**: Client-side mathematical scoring incorporating historical consumption, seasonal margins (monsoon snakebites, winter respiratory spikes), and visit trend percentages.
5. **AI Routing Optimizer**: Multi-Objective Genetic Algorithm (GA) solving NP-Hard vehicle route queries:
   * **Population Size**: 40 chromosomes
   * **Generations**: 30 epochs
   * **Crossover Probability**: 80% (single-point)
   * **Mutation Probability**: 1.5% (adaptive random swap)
   * **Objectives**: Minimized travel distance, maximized waste prevention, and minimized clinic stockout durations.

---

## ⚙️ How to Run Locally

To launch the project on your local system:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the local development server
npm run dev
```

*Access the running interface at `http://localhost:5173/`.*
