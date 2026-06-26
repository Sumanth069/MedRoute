import math
import random
from sqlalchemy.orm import Session
from database import Clinic, Medicine, Inventory, TransferManifest

# Haversine formula to compute distance between two lat/lng coordinates in km
def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
         
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class MultiObjectiveOptimizer:
    def __init__(self, db: Session):
        self.db = db
        # Weights for optimization utility
        self.w_priority = 40.0   # Weight for saving critical level medicines
        self.w_expiry = 60.0     # Weight for saving medicines from waste
        self.w_distance = 1.2    # Penalty weight for distance (km)
        
    def find_surplus_and_deficits(self):
        """
        Identifies clinics in deficit (stockout imminent <= 7 days) 
        and clinics with surplus (high stock or stock expiring soon).
        """
        inventories = self.db.query(Inventory).all()
        
        deficits = []
        surpluses = []
        
        for inv in inventories:
            # Simple forecast: days until stockout = current_stock / daily_consumption (adjusted by season & visit trend)
            effective_consumption = inv.avg_daily_consumption * (1.0 + inv.visit_trend / 100.0) * (1.0 + inv.season_score * 0.4)
            effective_consumption = max(0.1, effective_consumption)
            
            days_until_stockout = inv.current_stock / effective_consumption
            
            # 1. Deficit criteria: stockout in <= 7 days, OR stock is literally 0
            if days_until_stockout <= 7.0 or inv.current_stock == 0:
                # Calculate how much stock they need to survive for 14 days
                needed_stock = int(math.ceil(effective_consumption * 14)) - inv.current_stock
                needed_stock = max(5, needed_stock)  # minimum transfer amount
                deficits.append({
                    "inventory_id": inv.id,
                    "clinic": inv.clinic,
                    "medicine": inv.medicine,
                    "current_stock": inv.current_stock,
                    "days_until_stockout": round(days_until_stockout, 1),
                    "needed_stock": needed_stock,
                    "daily_consumption": inv.avg_daily_consumption
                })
                
            # 2. Surplus criteria: expiring in <= 15 days, OR stock exceeds 30 days of consumption
            elif inv.days_to_expiry <= 15 or inv.current_stock > (effective_consumption * 30):
                # Calculate safe surplus amount they can donate (keeping at least 15 days of stock)
                safe_reserve = int(math.ceil(effective_consumption * 15))
                available_donation = inv.current_stock - safe_reserve
                
                # If it's expiring, we want to donate ALL of it to avoid waste
                if inv.days_to_expiry <= 10:
                    available_donation = inv.current_stock
                    
                if available_donation > 5:
                    surpluses.append({
                        "inventory_id": inv.id,
                        "clinic": inv.clinic,
                        "medicine": inv.medicine,
                        "current_stock": inv.current_stock,
                        "days_to_expiry": inv.days_to_expiry,
                        "available_donation": available_donation
                    })
                    
        return deficits, surpluses

    def evaluate_chromosome(self, chromosome, deficits, surpluses):
        """
        Calculates the multi-objective utility score for a proposed route plan (chromosome).
        A chromosome is a list of transfer actions: (surplus_index, deficit_index, quantity)
        """
        if not chromosome:
            return 0.0
            
        total_utility = 0.0
        used_surplus = {} # Track donations to avoid double donating
        used_deficit = {} # Track fulfilled deficits
        
        for surplus_idx, deficit_idx, qty in chromosome:
            surp = surpluses[surplus_idx]
            defc = deficits[deficit_idx]
            
            # Constraint 1: Must be the same medicine
            if surp["medicine"].id != defc["medicine"].id:
                return -9999.0  # Invalid chromosome
                
            # Constraint 2: Cannot transfer more than available surplus
            s_key = surp["inventory_id"]
            already_donated = used_surplus.get(s_key, 0)
            if already_donated + qty > surp["available_donation"]:
                # Penalize but allow with penalty to help GA converge
                total_utility -= 500.0
                
            # Constraint 3: Cannot transfer between same clinic
            if surp["clinic"].id == defc["clinic"].id:
                return -9999.0
                
            # Calculate metrics
            dist = calculate_haversine_distance(
                surp["clinic"].latitude, surp["clinic"].longitude,
                defc["clinic"].latitude, defc["clinic"].longitude
            )
            
            # Calculate utility terms
            # A. Priority benefit (higher priority level = higher benefit)
            priority_benefit = defc["medicine"].priority_level * self.w_priority
            
            # B. Expiry saving benefit: if surplus is close to expiring, saving it gets high utility
            expiry_benefit = (100.0 / max(1.0, surp["days_to_expiry"])) * self.w_expiry
            
            # C. Distance penalty
            distance_cost = dist * self.w_distance
            
            # D. Deficit fulfillment bonus
            d_key = defc["inventory_id"]
            already_received = used_deficit.get(d_key, 0)
            percent_fulfilled = min(1.0, (already_received + qty) / defc["needed_stock"])
            fulfillment_bonus = percent_fulfilled * 100.0
            
            # Combined utility for this transfer
            transfer_utility = priority_benefit + expiry_benefit + fulfillment_bonus - distance_cost
            
            total_utility += transfer_utility
            used_surplus[s_key] = already_donated + qty
            used_deficit[d_key] = already_received + qty
            
        return total_utility

    def run_genetic_algorithm(self, generations=40, population_size=50):
        """
        A custom Genetic Algorithm that solves the Multi-Objective transfer allocation.
        """
        deficits, surpluses = self.find_surplus_and_deficits()
        
        if not deficits or not surpluses:
            return []
            
        # Find matching medicine pairs
        matches = []
        for s_idx, surp in enumerate(surpluses):
            for d_idx, defc in enumerate(deficits):
                if surp["medicine"].id == defc["medicine"].id and surp["clinic"].id != defc["clinic"].id:
                    matches.append((s_idx, d_idx))
                    
        if not matches:
            return []
            
        # Initialize population
        # Each chromosome is a list of transfer matches with randomly chosen quantities
        population = []
        for _ in range(population_size):
            chromosome_len = random.randint(1, min(6, len(matches)))
            selected_matches = random.sample(matches, chromosome_len)
            chromosome = []
            for s_idx, d_idx in selected_matches:
                surp = surpluses[s_idx]
                defc = deficits[d_idx]
                qty = random.randint(5, min(surp["available_donation"], defc["needed_stock"]))
                chromosome.append((s_idx, d_idx, qty))
            population.append(chromosome)
            
        # Evolution Loop
        for gen in range(generations):
            # 1. Evaluate fitness
            fitness_scores = [self.evaluate_chromosome(chrom, deficits, surpluses) for chrom in population]
            
            # Pair chromosomes with their fitness
            scored_pop = list(zip(population, fitness_scores))
            # Sort by fitness descending
            scored_pop.sort(key=lambda x: x[1], reverse=True)
            
            # Select parents (Elitism: keep top 20% directly)
            elite_size = int(population_size * 0.2)
            next_generation = [item[0] for item in scored_pop[:elite_size]]
            
            # 2. Crossover & Mutation to fill the rest
            while len(next_generation) < population_size:
                # Tournament selection
                p1 = self_tournament_select(scored_pop)
                p2 = self_tournament_select(scored_pop)
                
                # Single-point Crossover
                if len(p1) > 1 and len(p2) > 1 and random.random() < 0.8:
                    cut = random.randint(1, min(len(p1), len(p2)) - 1)
                    child = p1[:cut] + p2[cut:]
                else:
                    child = p1.copy()
                    
                # Mutation: add, remove, or change a transfer
                if random.random() < 0.3:
                    mut_type = random.choice(["add", "remove", "quantity"])
                    if mut_type == "add" and len(child) < 6:
                        # Add a new random match
                        new_match = random.choice(matches)
                        if new_match not in [(c[0], c[1]) for c in child]:
                            surp = surpluses[new_match[0]]
                            defc = deficits[new_match[1]]
                            qty = random.randint(5, min(surp["available_donation"], defc["needed_stock"]))
                            child.append((new_match[0], new_match[1], qty))
                    elif mut_type == "remove" and len(child) > 1:
                        child.pop(random.randint(0, len(child) - 1))
                    elif mut_type == "quantity" and child:
                        idx = random.randint(0, len(child) - 1)
                        s_idx, d_idx, qty = child[idx]
                        surp = surpluses[s_idx]
                        defc = deficits[d_idx]
                        new_qty = random.randint(5, min(surp["available_donation"], defc["needed_stock"]))
                        child[idx] = (s_idx, d_idx, new_qty)
                        
                next_generation.append(child)
                
            population = next_generation
            
        # Final Selection: return the best chromosome
        best_chromosome = scored_pop[0][0]
        
        # Format the best chromosome into readable actions
        recommendations = []
        for s_idx, d_idx, qty in best_chromosome:
            surp = surpluses[s_idx]
            defc = deficits[d_idx]
            
            dist = calculate_haversine_distance(
                surp["clinic"].latitude, surp["clinic"].longitude,
                defc["clinic"].latitude, defc["clinic"].longitude
            )
            
            # Simple travel time: 1.5 mins per km + 10 mins buffer
            travel_time = int(dist * 1.5 + 10)
            
            # Calculate waste savings (approx cost saved)
            # Standard medicine costs
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
            cost_per_unit = med_costs.get(surp["medicine"].name, 50)
            expiry_waste_saved = qty * cost_per_unit if surp["days_to_expiry"] <= 10 else 0
            
            recommendations.append({
                "source_clinic_id": surp["clinic"].id,
                "source_clinic_name": surp["clinic"].name,
                "dest_clinic_id": defc["clinic"].id,
                "dest_clinic_name": defc["clinic"].name,
                "medicine_id": surp["medicine"].id,
                "medicine_name": surp["medicine"].name,
                "medicine_priority": surp["medicine"].priority_level,
                "quantity": qty,
                "distance_km": dist,
                "estimated_travel_time_mins": travel_time,
                "waste_saved_rs": expiry_waste_saved,
                "surplus_days_to_expiry": surp["days_to_expiry"]
            })
            
        # Sort recommendations by priority (critical first)
        recommendations.sort(key=lambda x: x["medicine_priority"], reverse=True)
        return recommendations

def self_tournament_select(scored_pop, k=3):
    selected = random.sample(scored_pop, k)
    selected.sort(key=lambda x: x[1], reverse=True)
    return selected[0][0]

if __name__ == "__main__":
    # Test the optimizer
    from database import SessionLocal
    db = SessionLocal()
    optimizer = MultiObjectiveOptimizer(db)
    
    print("\nRunning Multi-Objective Optimization Solver (Genetic Algorithm under the hood)...")
    results = optimizer.run_genetic_algorithm()
    
    print(f"\nOptimization complete. Found {len(results)} recommended transfer actions:")
    for idx, r in enumerate(results):
        print(f"\n--- Recommendation #{idx+1} ---")
        print(f"Action: Transfer {r['quantity']} units of {r['medicine_name']} from {r['source_clinic_name']} -> {r['dest_clinic_name']}")
        print(f"Distance: {r['distance_km']} km | Travel Time: {r['estimated_travel_time_mins']} mins")
        print(f"Medical Priority: Level {r['medicine_priority']}")
        if r['waste_saved_rs'] > 0:
            print(f"Saving Alert: Prevents Rs. {r['waste_saved_rs']} in expiration waste! (Expiry: {r['surplus_days_to_expiry']} days)")
    db.close()
