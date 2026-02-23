import { supabase } from './src/integrations/supabase/client';

async function testInsert() {
    const { data, error } = await supabase.from('questions').insert({
        question_text: 'Test Question',
        correct_answer: 'Test Answer',
        points: 10,
        question_type: 'text',
        options: null,
        round_number: 1,
        suit: 'spades',
        image_url: null,
        question_number: 99,
        game_id: null
    });
    console.log("Error:", error);
    console.log("Data:", data);
}

testInsert();
