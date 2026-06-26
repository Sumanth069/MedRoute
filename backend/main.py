import asyncio
import json
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db_and_seed, Clinic, Medicine, Inventory, TransferManifest
from forecaster import forecaster
from optimizer import MultiObjectiveOptimizer

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medroute-api")

app = FastAPI(title="MedRoute API", description="Digital Health Command Center Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                # We don't remove connection immediately to avoid mutating list during iteration,
                # cleanup happens on disconnect/exceptions handled elsewhere.

manager = ConnectionManager()

# Initialize DB on startup
@app.on_event("startup")
async def startup_event():
    init_db_and_seed()
    # Start background task to broadcast live alerts via WebSockets
    asyncio.create_task(periodic_alert_broadcaster())

async def periodic_alert_broadcaster():
    """
    Background loop to scan inventories and broadcast critical alerts 
    every 10 seconds to all connected dashboard clients.
    """
    while True:
        try:
            await asyncio.sleep(10)
            if not manager.active_connections:
                continue
                
            from database import SessionLocal
            db = SessionLocal()
            try:
                # Find critical items (stockout in <= 3 days, priority level >= 4)
                inventories = db.query(Inventory).all()
                alerts = []
                for inv in inventories:
                    # Calculate effective consumption
                    effective_consumption = inv.avg_daily_consumption * (1.0 + inv.visit_trend / 100.0) * (1.0 + inv.season_score * 0.4)
                    effective_consumption = max(0.1, effective_consumption)
                    days_until_stockout = inv.current_stock / effective_consumption
                    
                    if inv.current_stock == 0:
                        alerts.append({
                            "type": "critical",
                            "clinic_name": inv.clinic.name,
                            "medicine_name": inv.medicine.name,
                            "priority": inv.medicine.priority_level,
                            "message": f"STOCKOUT ALERT: {inv.clinic.name} is completely out of {inv.medicine.name}!"
                        })
                    elif days_until_stockout <= 3.0 and inv.medicine.priority_level >= 4:
                        alerts.append({
                            "type": "critical",
                            "clinic_name": inv.clinic.name,
                            "medicine_name": inv.medicine.name,
                            "priority": inv.medicine.priority_level,
                            "message": f"CRITICAL STOCKOUT: {inv.clinic.name} faces stockout of {inv.medicine.name} in {round(days_until_stockout, 1)} days."
                        })
                    elif days_until_stockout <= 5.0 and inv.medicine.priority_level >= 3:
                        alerts.append({
                            "type": "warning",
                            "clinic_name": inv.clinic.name,
                            "medicine_name": inv.medicine.name,
                            "priority": inv.medicine.priority_level,
                            "message": f"WARNING: {inv.clinic.name} inventory for {inv.medicine.name} dropping. Stockout in {round(days_until_stockout, 1)} days."
                        })
                    
                    # Also alert on near expiry surplus
                    if inv.days_to_expiry <= 5 and inv.current_stock > 10:
                        alerts.append({
                            "type": "expiry",
                            "clinic_name": inv.clinic.name,
                            "medicine_name": inv.medicine.name,
                            "priority": inv.medicine.priority_level,
                            "message": f"EXPIRY ALERT: {inv.clinic.name} has {inv.current_stock} units of {inv.medicine.name} expiring in {inv.days_to_expiry} days!"
                        })

                if alerts:
                    # Choose a random alert to broadcast to simulate live telemetry
                    import random
                    selected_alert = random.choice(alerts)
                    selected_alert["timestamp"] = datetime_now_iso()
                    await manager.broadcast(json.dumps(selected_alert))
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in alert broadcaster: {e}")

def datetime_now_iso():
    import datetime
    return datetime.datetime.utcnow().isoformat() + "Z"

# 1. API: Get all clinics with summarized inventory health
@app.get("/api/clinics")
def get_clinics(db: Session = Depends(get_db)):
    clinics = db.query(Clinic).all()
    results = []
    
    for clinic in clinics:
        critical_count = 0
        warning_count = 0
        surplus_count = 0
        total_items = len(clinic.inventory)
        
        for inv in clinic.inventory:
            effective_consumption = inv.avg_daily_consumption * (1.0 + inv.visit_trend / 100.0) * (1.0 + inv.season_score * 0.4)
            effective_consumption = max(0.1, effective_consumption)
            days_until_stockout = inv.current_stock / effective_consumption
            
            # Forecast threshold
            if inv.current_stock == 0 or (days_until_stockout <= 3.0 and inv.medicine.priority_level >= 4):
                critical_count += 1
            elif days_until_stockout <= 7.0:
                warning_count += 1
                
            # Surplus check
            if inv.days_to_expiry <= 10 and inv.current_stock > 10:
                surplus_count += 1
                
        status = "stable"
        if critical_count > 0:
            status = "critical"
        elif warning_count > 0:
            status = "warning"
            
        results.append({
            "id": clinic.id,
            "name": clinic.name,
            "type": clinic.type,
            "latitude": clinic.latitude,
            "longitude": clinic.longitude,
            "address": clinic.address,
            "phone": clinic.phone,
            "status": status,
            "critical_count": critical_count,
            "warning_count": warning_count,
            "surplus_count": surplus_count,
            "total_items": total_items
        })
        
    return results

# 2. API: Get clinic details with full inventory + AI forecasting + XAI
@app.get("/api/clinics/{clinic_id}")
def get_clinic_detail(clinic_id: int, db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
        
    inventory_details = []
    for inv in clinic.inventory:
        # Run AI Forecast model with SHAP explanations
        forecast_res = forecaster.predict(
            current_stock=inv.current_stock,
            avg_daily_consumption=inv.avg_daily_consumption,
            days_to_expiry=inv.days_to_expiry,
            season_score=inv.season_score,
            visit_trend=inv.visit_trend
        )
        
        inventory_details.append({
            "id": inv.id,
            "medicine_id": inv.medicine.id,
            "medicine_name": inv.medicine.name,
            "medicine_category": inv.medicine.category,
            "priority_level": inv.medicine.priority_level,
            "batch_name": inv.batch_name,
            "current_stock": inv.current_stock,
            "avg_daily_consumption": inv.avg_daily_consumption,
            "days_to_expiry": inv.days_to_expiry,
            "visit_trend": inv.visit_trend,
            "season_score": inv.season_score,
            # AI Forecast fields
            "days_until_stockout": forecast_res["days_until_stockout"],
            "confidence": forecast_res["confidence"],
            "xai_reasons": forecast_res["xai_reasons"]
        })
        
    # Sort inventory by priority (level 5 first) then stockout threat
    inventory_details.sort(key=lambda x: (-x["priority_level"], x["days_until_stockout"]))
    
    return {
        "id": clinic.id,
        "name": clinic.name,
        "type": clinic.type,
        "latitude": clinic.latitude,
        "longitude": clinic.longitude,
        "address": clinic.address,
        "phone": clinic.phone,
        "inventory": inventory_details
    }

# 3. API: Run multi-objective optimization to generate route transfer suggestions
@app.post("/api/optimizer/run")
def run_optimization(db: Session = Depends(get_db)):
    optimizer = MultiObjectiveOptimizer(db)
    recommendations = optimizer.run_genetic_algorithm()
    return recommendations

# 4. API: Create transfer manifests (approve route recommendation)
@app.post("/api/manifests/create")
def create_manifest(data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        source_id = int(data["source_clinic_id"])
        dest_id = int(data["dest_clinic_id"])
        med_id = int(data["medicine_id"])
        qty = int(data["quantity"])
        travel_time = int(data["estimated_travel_time_mins"])
        dist = float(data["distance_km"])
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
        
    # 1. Verify and update source inventory
    source_inv = db.query(Inventory).filter(
        Inventory.clinic_id == source_id,
        Inventory.medicine_id == med_id
    ).first()
    
    if not source_inv or source_inv.current_stock < qty:
        raise HTTPException(status_code=400, detail="Insufficient stock at source clinic")
        
    # Deduct stock from source clinic
    source_inv.current_stock -= qty
    
    # 2. Create manifest
    manifest = TransferManifest(
        source_clinic_id=source_id,
        dest_clinic_id=dest_id,
        medicine_id=med_id,
        quantity=qty,
        estimated_travel_time_mins=travel_time,
        distance_km=dist,
        status="pending"
    )
    
    db.add(manifest)
    db.commit()
    db.refresh(manifest)
    
    # Broadcast WebSocket update alert
    asyncio.create_task(manager.broadcast(json.dumps({
        "type": "manifest_created",
        "message": f"NEW MANIFEST: Driver dispatched to transfer {qty} units of {source_inv.medicine.name} from {source_inv.clinic.name} to {db.query(Clinic).get(dest_id).name}.",
        "timestamp": datetime_now_iso()
    })))
    
    return {
        "success": True,
        "manifest_id": manifest.id,
        "status": manifest.status
    }

# 5. API: Get all active / historical transfer manifests
@app.get("/api/manifests")
def get_manifests(db: Session = Depends(get_db)):
    manifests = db.query(TransferManifest).order_by(TransferManifest.created_at.desc()).all()
    results = []
    
    for m in manifests:
        results.append({
            "id": m.id,
            "source_clinic_name": m.source_clinic.name,
            "dest_clinic_name": m.dest_clinic.name,
            "medicine_name": m.medicine.name,
            "medicine_priority": m.medicine.priority_level,
            "quantity": m.quantity,
            "estimated_travel_time_mins": m.estimated_travel_time_mins,
            "distance_km": m.distance_km,
            "status": m.status,
            "driver_signature": m.driver_signature,
            "created_at": m.created_at.isoformat()
        })
        
    return results

# 6. API: Update manifest status (Driver PWA action)
@app.post("/api/manifests/{manifest_id}/update")
def update_manifest(manifest_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    manifest = db.query(TransferManifest).filter(TransferManifest.id == manifest_id).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest not found")
        
    new_status = data.get("status")
    signature = data.get("driver_signature")
    
    if new_status not in ["pending", "in_transit", "delivered"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    manifest.status = new_status
    if signature:
        manifest.driver_signature = signature
        
    # If delivered, add stock to the destination clinic inventory
    if new_status == "delivered":
        dest_inv = db.query(Inventory).filter(
            Inventory.clinic_id == manifest.dest_clinic_id,
            Inventory.medicine_id == manifest.medicine_id
        ).first()
        
        if dest_inv:
            dest_inv.current_stock += manifest.quantity
        else:
            # Create a new inventory record if it somehow didn't exist
            dest_inv = Inventory(
                clinic_id=manifest.dest_clinic_id,
                medicine_id=manifest.medicine_id,
                batch_name=f"B-TRANS-{manifest.id}",
                current_stock=manifest.quantity,
                avg_daily_consumption=1.0,
                days_to_expiry=120,
                visit_trend=0.0,
                season_score=0.5
            )
            db.add(dest_inv)
            
    db.commit()
    
    # Broadcast status change to dashboard
    asyncio.create_task(manager.broadcast(json.dumps({
        "type": "manifest_updated",
        "manifest_id": manifest.id,
        "status": new_status,
        "message": f"ROUTE UPDATE: Manifest #{manifest.id} is now {new_status.upper()}.",
        "timestamp": datetime_now_iso()
    })))
    
    return {"success": True, "status": manifest.status}

# 7. WebSocket Alert Feed Connection
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection open
        while True:
            # We can receive ping messages or requests from the client if needed
            data = await websocket.receive_text()
            # Just echoing back or ignoring client requests for now (read-only telemetry stream)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 8. API: System Statistics / Impact Counter
@app.get("/api/analytics/stats")
def get_analytics_stats(db: Session = Depends(get_db)):
    # 1. Total waste saved: count all delivered/active manifests that saved stock from expiry
    manifests = db.query(TransferManifest).all()
    
    # standard costs
    med_costs = {
        "Anti-Venom": 1500,
        "Blood Plasma": 2500,
        "Anti-Rabies Vaccine": 800,
        "Insulin": 450,
        "Rotavirus Vaccine": 300,
        "Amoxicillin": 150,
        "Oral Rehydration Salts (ORS)": 20,
        "Paracetamol": 10
    }
    
    total_waste_prevented_rs = 0
    total_items_saved = 0
    active_deliveries = 0
    completed_deliveries = 0
    
    for m in manifests:
        cost = med_costs.get(m.medicine.name, 50)
        # If it was delivered or is currently in transit, it prevents expiry waste
        if m.status in ["in_transit", "delivered"]:
            total_items_saved += m.quantity
            total_waste_prevented_rs += m.quantity * cost
            
        if m.status == "delivered":
            completed_deliveries += 1
        elif m.status in ["pending", "in_transit"]:
            active_deliveries += 1
            
    # Calculate district stockouts: how many items currently at 0 stock
    zero_stock_items = db.query(Inventory).filter(Inventory.current_stock == 0).count()
    
    # Calculate average stockout days remaining across all clinics
    all_inventories = db.query(Inventory).all()
    avg_horizon = 14.5 # baseline
    if all_inventories:
        horizons = []
        for inv in all_inventories:
            eff_use = inv.avg_daily_consumption * (1.0 + inv.visit_trend/100.0) * (1.0 + inv.season_score*0.4)
            eff_use = max(0.1, eff_use)
            horizons.append(inv.current_stock / eff_use)
        avg_horizon = round(sum(horizons) / len(horizons), 1)
        
    return {
        "total_items_saved": total_items_saved,
        "total_waste_prevented_rs": total_waste_prevented_rs,
        "active_deliveries": active_deliveries,
        "completed_deliveries": completed_deliveries,
        "district_stockouts": zero_stock_items,
        "average_safety_horizon_days": avg_horizon
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
