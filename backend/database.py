import os
import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///C:/Users/kpsum/MedRoute/backend/medroute.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Clinic(Base):
    __tablename__ = "clinics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # "PHC", "CHC", "District Hospital", "ASHA Center"
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    inventory = relationship("Inventory", back_populates="clinic", cascade="all, delete-orphan")

class Medicine(Base):
    __tablename__ = "medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)
    priority_level = Column(Integer, nullable=False)  # 1 to 5
    description = Column(String, nullable=True)
    
    inventory = relationship("Inventory", back_populates="medicine", cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_name = Column(String, nullable=False)
    current_stock = Column(Integer, nullable=False)
    avg_daily_consumption = Column(Float, nullable=False)
    days_to_expiry = Column(Integer, nullable=False)
    visit_trend = Column(Float, nullable=False)  # e.g., +15.0% or -5.0%
    season_score = Column(Float, nullable=False)  # 0.0 to 1.0
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    
    clinic = relationship("Clinic", back_populates="inventory")
    medicine = relationship("Medicine", back_populates="inventory")

class TransferManifest(Base):
    __tablename__ = "transfer_manifests"
    
    id = Column(Integer, primary_key=True, index=True)
    source_clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    dest_clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    estimated_travel_time_mins = Column(Integer, nullable=False)
    distance_km = Column(Float, nullable=False)
    status = Column(String, default="pending")  # "pending", "in_transit", "delivered"
    driver_signature = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    source_clinic = relationship("Clinic", foreign_keys=[source_clinic_id])
    dest_clinic = relationship("Clinic", foreign_keys=[dest_clinic_id])
    medicine = relationship("Medicine")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_and_seed():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Clinic).count() > 0:
        db.close()
        return
        
    print("Seeding database...")
    
    # 1. Seed Medicines
    medicines = [
        Medicine(name="Anti-Venom", category="Critical Care", priority_level=5, description="Polyvalent snake antivenom injection"),
        Medicine(name="Blood Plasma", category="Emergency", priority_level=5, description="Frozen blood plasma bags"),
        Medicine(name="Anti-Rabies Vaccine", category="Vaccines", priority_level=5, description="Rabies post-exposure vaccine"),
        Medicine(name="Insulin", category="Chronic Care", priority_level=4, description="Recombinant human insulin injection"),
        Medicine(name="Rotavirus Vaccine", category="Vaccines", priority_level=4, description="Oral rotavirus vaccine for children"),
        Medicine(name="Amoxicillin", category="Antibiotics", priority_level=3, description="Broad-spectrum penicillin antibiotic"),
        Medicine(name="Oral Rehydration Salts (ORS)", category="Primary Care", priority_level=2, description="ORS packets for dehydration"),
        Medicine(name="Paracetamol", category="Analgesics", priority_level=1, description="Common pain relief and antipyretic"),
    ]
    for med in medicines:
        db.add(med)
    db.commit()
    
    # 2. Seed Clinics (15 clinics around Bangalore/Ramanagara/Tumkur region)
    clinics = [
        # Center of district
        Clinic(name="Ramanagara PHC", type="PHC", latitude=12.722, longitude=77.278, address="KSRTC Bus Stand Road, Ramanagara", phone="+91 9845011111"),
        Clinic(name="Tumkur District Hospital", type="District Hospital", latitude=13.340, longitude=77.100, address="BH Road, Tumkur", phone="+91 9845022222"),
        Clinic(name="Channapatna CHC", type="CHC", latitude=12.652, longitude=77.202, address="M G Road, Channapatna", phone="+91 9845033333"),
        Clinic(name="Maddur PHC", type="PHC", latitude=12.584, longitude=77.045, address="Near Railway Station, Maddur", phone="+91 9845044444"),
        Clinic(name="Mandya District Hospital", type="District Hospital", latitude=12.522, longitude=76.897, address="M C Road, Mandya", phone="+91 9845055555"),
        Clinic(name="Magadi CHC", type="CHC", latitude=12.957, longitude=77.228, address="Tirumale Road, Magadi", phone="+91 9845066666"),
        Clinic(name="Kanakapura PHC", type="PHC", latitude=12.545, longitude=77.420, address="Sangama Road, Kanakapura", phone="+91 9845077777"),
        Clinic(name="Bidadi PHC", type="PHC", latitude=12.798, longitude=77.382, address="Bengaluru-Mysore Highway, Bidadi", phone="+91 9845088888"),
        Clinic(name="Nelamangala CHC", type="CHC", latitude=13.097, longitude=77.391, address="Tumkur Road, Nelamangala", phone="+91 9845099999"),
        Clinic(name="Dobbaspet PHC", type="PHC", latitude=13.220, longitude=77.240, address="National Highway 48, Dobbaspet", phone="+91 9845012121"),
        Clinic(name="Gubbi PHC", type="PHC", latitude=13.310, longitude=76.940, address="BH Road, Gubbi", phone="+91 9845013131"),
        Clinic(name="Kunigal CHC", type="CHC", latitude=13.023, longitude=77.037, address="BM Road, Kunigal", phone="+91 9845014141"),
        Clinic(name="Devanahalli CHC", type="CHC", latitude=13.248, longitude=77.712, address="NH 7, Devanahalli", phone="+91 9845015151"),
        Clinic(name="Hoskote PHC", type="PHC", latitude=13.070, longitude=77.798, address="Old Madras Road, Hoskote", phone="+91 9845016161"),
        Clinic(name="Anekal CHC", type="CHC", latitude=12.709, longitude=77.697, address="Thally Road, Anekal", phone="+91 9845017171"),
    ]
    for clinic in clinics:
        db.add(clinic)
    db.commit()
    
    # Refresh references
    db_medicines = db.query(Medicine).all()
    db_clinics = db.query(Clinic).all()
    
    med_map = {m.name: m.id for m in db_medicines}
    clinic_map = {c.name: c.id for c in db_clinics}
    
    # 3. Seed Inventory with a mix of surplus (about to expire) and deficits (critical stockouts)
    # Standard format: Inventory(clinic_id, medicine_id, batch_number, current_stock, avg_daily_consumption, days_to_expiry, visit_trend, season_score)
    inventory_items = [
        # Ramanagara PHC: Critical deficit in Anti-Venom and Insulin
        Inventory(clinic_id=clinic_map["Ramanagara PHC"], medicine_id=med_map["Anti-Venom"], batch_name="B-AV-001", current_stock=2, avg_daily_consumption=0.8, days_to_expiry=145, visit_trend=25.0, season_score=0.9), # Monsoon active, high risk
        Inventory(clinic_id=clinic_map["Ramanagara PHC"], medicine_id=med_map["Insulin"], batch_name="B-IN-002", current_stock=5, avg_daily_consumption=2.0, days_to_expiry=30, visit_trend=15.0, season_score=0.5), # Stockout in 2.5 days
        Inventory(clinic_id=clinic_map["Ramanagara PHC"], medicine_id=med_map["Amoxicillin"], batch_name="B-AX-003", current_stock=120, avg_daily_consumption=10.0, days_to_expiry=12, visit_trend=5.0, season_score=0.4), # Safe for now, but expiry is 12 days
        Inventory(clinic_id=clinic_map["Ramanagara PHC"], medicine_id=med_map["Paracetamol"], batch_name="B-PM-004", current_stock=50, avg_daily_consumption=25.0, days_to_expiry=180, visit_trend=10.0, season_score=0.3), # Low priority but will stock out in 2 days
        
        # Nelamangala CHC: Surplus Anti-Venom expiring in 3 days!
        Inventory(clinic_id=clinic_map["Nelamangala CHC"], medicine_id=med_map["Anti-Venom"], batch_name="B-AV-009", current_stock=25, avg_daily_consumption=0.1, days_to_expiry=3, visit_trend=-5.0, season_score=0.9), # HUGE waste risk (24 units will waste)
        Inventory(clinic_id=clinic_map["Nelamangala CHC"], medicine_id=med_map["Insulin"], batch_name="B-IN-010", current_stock=80, avg_daily_consumption=1.5, days_to_expiry=120, visit_trend=2.0, season_score=0.5), # Good surplus
        
        # Tumkur District Hospital: Hub with huge insulin stocks, some expiring in 4 days!
        Inventory(clinic_id=clinic_map["Tumkur District Hospital"], medicine_id=med_map["Insulin"], batch_name="B-IN-005", current_stock=150, avg_daily_consumption=3.0, days_to_expiry=4, visit_trend=5.0, season_score=0.5), # High waste risk
        Inventory(clinic_id=clinic_map["Tumkur District Hospital"], medicine_id=med_map["Anti-Venom"], batch_name="B-AV-006", current_stock=50, avg_daily_consumption=0.5, days_to_expiry=220, visit_trend=10.0, season_score=0.9),
        Inventory(clinic_id=clinic_map["Tumkur District Hospital"], medicine_id=med_map["Blood Plasma"], batch_name="B-BP-007", current_stock=3, avg_daily_consumption=1.5, days_to_expiry=15, visit_trend=30.0, season_score=0.6), # Deficit in Plasma
        
        # Mandya District Hospital: High stock of Blood Plasma expiring in 6 days!
        Inventory(clinic_id=clinic_map["Mandya District Hospital"], medicine_id=med_map["Blood Plasma"], batch_name="B-BP-011", current_stock=15, avg_daily_consumption=0.2, days_to_expiry=6, visit_trend=0.0, season_score=0.6), # Surplus expiring
        Inventory(clinic_id=clinic_map["Mandya District Hospital"], medicine_id=med_map["Anti-Rabies Vaccine"], batch_name="B-AR-012", current_stock=40, avg_daily_consumption=2.0, days_to_expiry=120, visit_trend=8.0, season_score=0.5),
        
        # Bidadi PHC: Critical Deficit in Anti-Rabies Vaccine (0 stock)
        Inventory(clinic_id=clinic_map["Bidadi PHC"], medicine_id=med_map["Anti-Rabies Vaccine"], batch_name="B-AR-015", current_stock=0, avg_daily_consumption=1.2, days_to_expiry=0, visit_trend=15.0, season_score=0.5), # Stocked out!
        Inventory(clinic_id=clinic_map["Bidadi PHC"], medicine_id=med_map["Paracetamol"], batch_name="B-PM-016", current_stock=1500, avg_daily_consumption=30.0, days_to_expiry=200, visit_trend=5.0, season_score=0.3),
        
        # Channapatna CHC: High stock of Anti-Rabies expiring in 5 days
        Inventory(clinic_id=clinic_map["Channapatna CHC"], medicine_id=med_map["Anti-Rabies Vaccine"], batch_name="B-AR-020", current_stock=18, avg_daily_consumption=0.3, days_to_expiry=5, visit_trend=-2.0, season_score=0.5), # Surplus expiring
        Inventory(clinic_id=clinic_map["Channapatna CHC"], medicine_id=med_map["Amoxicillin"], batch_name="B-AX-021", current_stock=600, avg_daily_consumption=15.0, days_to_expiry=140, visit_trend=0.0, season_score=0.4),
        
        # Maddur PHC: Needs ORS (high diarrhea outbreak due to season)
        Inventory(clinic_id=clinic_map["Maddur PHC"], medicine_id=med_map["Oral Rehydration Salts (ORS)"], batch_name="B-OR-025", current_stock=20, avg_daily_consumption=15.0, days_to_expiry=300, visit_trend=40.0, season_score=0.85), # Stockout in 1.3 days
        # Kanakapura PHC: Has excess ORS
        Inventory(clinic_id=clinic_map["Kanakapura PHC"], medicine_id=med_map["Oral Rehydration Salts (ORS)"], batch_name="B-OR-028", current_stock=500, avg_daily_consumption=5.0, days_to_expiry=250, visit_trend=0.0, season_score=0.3),
        
        # Magadi CHC: Needs Rotavirus Vaccine (outbreak)
        Inventory(clinic_id=clinic_map["Magadi CHC"], medicine_id=med_map["Rotavirus Vaccine"], batch_name="B-RV-030", current_stock=3, avg_daily_consumption=2.5, days_to_expiry=45, visit_trend=20.0, season_score=0.7), # Stockout in 1.2 days
        # Devanahalli CHC: Excess Rotavirus Vaccine expiring in 8 days
        Inventory(clinic_id=clinic_map["Devanahalli CHC"], medicine_id=med_map["Rotavirus Vaccine"], batch_name="B-RV-035", current_stock=35, avg_daily_consumption=0.5, days_to_expiry=8, visit_trend=1.0, season_score=0.5),
        
        # Dobbaspet PHC: General stock levels
        Inventory(clinic_id=clinic_map["Dobbaspet PHC"], medicine_id=med_map["Paracetamol"], batch_name="B-PM-040", current_stock=100, avg_daily_consumption=20.0, days_to_expiry=120, visit_trend=0.0, season_score=0.3),
        Inventory(clinic_id=clinic_map["Dobbaspet PHC"], medicine_id=med_map["Amoxicillin"], batch_name="B-AX-041", current_stock=80, avg_daily_consumption=8.0, days_to_expiry=150, visit_trend=5.0, season_score=0.4),
        
        # Gubbi PHC: Needs Amoxicillin
        Inventory(clinic_id=clinic_map["Gubbi PHC"], medicine_id=med_map["Amoxicillin"], batch_name="B-AX-045", current_stock=10, avg_daily_consumption=12.0, days_to_expiry=180, visit_trend=10.0, season_score=0.4),
        # Kunigal CHC: Excess Amoxicillin
        Inventory(clinic_id=clinic_map["Kunigal CHC"], medicine_id=med_map["Amoxicillin"], batch_name="B-AX-048", current_stock=800, avg_daily_consumption=10.0, days_to_expiry=90, visit_trend=0.0, season_score=0.4),
        
        # Hoskote PHC: Stable/general
        Inventory(clinic_id=clinic_map["Hoskote PHC"], medicine_id=med_map["Insulin"], batch_name="B-IN-050", current_stock=30, avg_daily_consumption=2.0, days_to_expiry=60, visit_trend=0.0, season_score=0.5),
        
        # Anekal CHC: Deficit in Insulin
        Inventory(clinic_id=clinic_map["Anekal CHC"], medicine_id=med_map["Insulin"], batch_name="B-IN-055", current_stock=4, avg_daily_consumption=2.2, days_to_expiry=90, visit_trend=12.0, season_score=0.5),
    ]
    
    # Fill in random baseline inventory for other medicines so all clinics have complete inventory records
    existing_pairs = set((item.clinic_id, item.medicine_id) for item in inventory_items)
    
    import random
    random.seed(42)
    batch_counter = 100
    
    for clinic in db_clinics:
        for med in db_medicines:
            if (clinic.id, med.id) not in existing_pairs:
                # Add baseline inventory (not critical, not expiring immediately)
                stock = random.randint(15, 100)
                daily_use = random.uniform(0.5, 4.0)
                expiry = random.randint(30, 365)
                visit = random.uniform(-10.0, 15.0)
                season = random.uniform(0.2, 0.7)
                
                # Make sure some critical items are not completely stocked out unless specified
                if med.name in ["Anti-Venom", "Blood Plasma"] and stock < 5:
                    stock = random.randint(10, 20)
                
                batch_counter += 1
                item = Inventory(
                    clinic_id=clinic.id,
                    medicine_id=med.id,
                    batch_name=f"B-GEN-{batch_counter}",
                    current_stock=stock,
                    avg_daily_consumption=round(daily_use, 1),
                    days_to_expiry=expiry,
                    visit_trend=round(visit, 1),
                    season_score=round(season, 2)
                )
                inventory_items.append(item)
                
    for item in inventory_items:
        db.add(item)
        
    db.commit()
    print("Database seeded with 15 clinics and full inventories.")
    db.close()

if __name__ == "__main__":
    init_db_and_seed()
