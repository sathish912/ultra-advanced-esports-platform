import os
import sys

# Add backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Clan, ClanMember, ClanJoinRequest
from auth import get_password_hash

def seed_db():
    db = SessionLocal()
    
    try:
        # Create 65 users
        users = []
        for i in range(1, 66):
            # Check if user exists
            email = f"player{i}@uaep.com"
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    name=f"Player {i}",
                    email=email,
                    password=get_password_hash("password123"),
                    role="player"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            users.append(user)

        # Leader indices as specified: 1, 3, 5, 7, 9 (1-indexed, so users[0], users[2], users[4], users[6], users[8])
        leader_indices = [0, 2, 4, 6, 8]
        
        clan_names = ["Apex Predators", "Cyber Ninjas", "Neon Knights", "Void Walkers", "Quantum Strikers"]
        clan_tags = ["APEX", "NINJ", "NEON", "VOID", "QSTM"]
        
        clans = []
        
        # Create Clans
        for i, idx in enumerate(leader_indices):
            leader = users[idx]
            # Check if clan exists for this leader
            clan = db.query(Clan).filter(Clan.leader_id == leader.id).first()
            if not clan:
                # Check if clan name exists, to avoid unique constraint failure
                clan = db.query(Clan).filter(Clan.name == clan_names[i]).first()
                if not clan:
                    clan = Clan(
                        name=clan_names[i],
                        tag=clan_tags[i],
                        leader_id=leader.id,
                        description=f"Welcome to {clan_names[i]}! We are recruiting.",
                        is_recruiting=True
                    )
                    db.add(clan)
                    db.commit()
                    db.refresh(clan)
                    
                    # Add leader as clan member
                    member = ClanMember(
                        clan_id=clan.id,
                        user_id=leader.id,
                        role="Leader"
                    )
                    db.add(member)
                    db.commit()
            clans.append(clan)

        # Distribute remaining users to request to join clans (approx 10-12 per clan)
        # Users who are not leaders
        non_leaders = [u for i, u in enumerate(users) if i not in leader_indices]
        
        # We have 5 clans, and 60 non_leaders. Exactly 12 per clan.
        for i, u in enumerate(non_leaders):
            clan = clans[i % 5]
            
            # Check if already a member or requested
            existing_member = db.query(ClanMember).filter(ClanMember.user_id == u.id, ClanMember.clan_id == clan.id).first()
            existing_req = db.query(ClanJoinRequest).filter(ClanJoinRequest.user_id == u.id, ClanJoinRequest.clan_id == clan.id).first()
            
            if not existing_member and not existing_req:
                req = ClanJoinRequest(
                    clan_id=clan.id,
                    user_id=u.id,
                    status="Pending"
                )
                db.add(req)
        
        db.commit()
        print("Database seeded successfully with 65 players, 5 clans, and join requests!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
