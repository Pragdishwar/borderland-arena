import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const dotenv = fs.readFileSync(envPath, 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

import('@supabase/supabase-js').then(supa => {
    const supabase = supa.createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    supabase.from('games').select('*').order('created_at', { ascending: false }).limit(3).then(({ data: games }) => {
        console.log('RECENT GAMES:', games?.map(g => ({ id: g.id, code: g.join_code })));
        if (games && games.length > 0) {
            supabase.from('teams').select('id, name').eq('game_id', games[0].id).then(({ data: teams, error }) => {
                console.log('TEAMS IN FIRST GAME:', teams);
                if (error) console.error("ERR1", error);
            });
            if (games.length > 1) {
                supabase.from('teams').select('id, name').eq('game_id', games[1].id).then(({ data: teams, error }) => {
                    console.log('TEAMS IN SECOND GAME:', teams);
                    if (error) console.error("ERR2", error);
                });
            }
        }
    });
});
