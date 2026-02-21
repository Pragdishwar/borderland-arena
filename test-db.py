import os
import sys

# Read env file
env = {}
try:
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k.strip()] = v.strip().strip("'\"")
except Exception as e:
    print(f"Failed to read .env: {e}")
    sys.exit(1)

import requests
url = env.get('VITE_SUPABASE_URL')
key = env.get('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    print("Missing URL or KEY")
    sys.exit(1)

# Fetch games
try:
    res = requests.get(
        f"{url}/rest/v1/games?select=*&order=created_at.desc&limit=3",
        headers={"apikey": key, "Authorization": f"Bearer {key}"}
    )
    games = res.json()
    print("RECENT GAMES:")
    for g in games:
        print(f" - {g.get('id')} ({g.get('join_code')})")
        
    if games:
        # Fetch teams for latest games
        for i in range(min(2, len(games))):
            gid = games[i].get('id')
            res2 = requests.get(
                f"{url}/rest/v1/teams?game_id=eq.{gid}&select=id,name",
                headers={"apikey": key, "Authorization": f"Bearer {key}"}
            )
            teams = res2.json()
            print(f"TEAMS IN GAME {i} ({gid}):", teams)

except Exception as e:
    print(f"Request failed: {e}")
