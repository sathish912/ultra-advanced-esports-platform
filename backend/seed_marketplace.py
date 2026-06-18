from database import SessionLocal
import models
from datetime import datetime

db = SessionLocal()

# Add Store Items
item1 = models.StoreItem(name="Ultra Premium Month", description="One month of premium status.", price=1000.0, item_type="premium", stock=-1, image_url="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop")
item2 = models.StoreItem(name="Cybernetic Hoodie (Physical)", description="Official Ultra Esports merchandise.", price=1499.0, item_type="merch", stock=50, image_url="https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=200&auto=format&fit=crop")
item3 = models.StoreItem(name="Golden Name Badge", description="Stand out in global chat.", price=300.0, item_type="badge", stock=-1, image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200&auto=format&fit=crop")

db.add(item1)
db.add(item2)
db.add(item3)
db.commit()

# Add Season and BattlePassSeason
season = models.Season(name="Season 1: Cyber Genesis", is_active=True)
db.add(season)
db.commit()
db.refresh(season)

bp = models.BattlePassSeason(name="Cyber Genesis BP", season_id=season.id, is_active=True)
db.add(bp)
db.commit()
db.refresh(bp)

# Add Tiers
tiers = [
    models.BattlePassTier(bp_season_id=bp.id, tier_level=1, required_xp=0, reward_name="Free Avatar Border", reward_type="cosmetic", is_premium=False),
    models.BattlePassTier(bp_season_id=bp.id, tier_level=2, required_xp=1000, reward_name="50 INR Wallet Bonus", reward_type="currency", is_premium=True),
    models.BattlePassTier(bp_season_id=bp.id, tier_level=3, required_xp=2500, reward_name="Rare Clan Tag", reward_type="badge", is_premium=False),
    models.BattlePassTier(bp_season_id=bp.id, tier_level=4, required_xp=5000, reward_name="Premium 3D Avatar", reward_type="cosmetic", is_premium=True),
    models.BattlePassTier(bp_season_id=bp.id, tier_level=5, required_xp=10000, reward_name="Exclusive Cyber Skin", reward_type="cosmetic", is_premium=True),
]

for t in tiers:
    db.add(t)

db.commit()
print("Marketplace seeded successfully!")
