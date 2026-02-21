import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const dotenv = fs.readFileSync(envPath, 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: games, error: gErr } = await supabase.from('games').select('*').order('created_at', { ascending: false }).limit(3);
    console.log("RECENT GAMES:", games);

    if (games && games.length > 0) {
        const { data: teams, error: tErr } = await supabase.from('teams').select('*').eq('game_id', games[0].id);
        console.log("TEAMS IN LATEST GAME:", teams);
        if (tErr) console.error("ERR", tErr);
    }
}
run();
