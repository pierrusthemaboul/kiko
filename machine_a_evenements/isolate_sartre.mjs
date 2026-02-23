
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function isolateSartre() {
    const title = "Décès du philosophe et écrivain Jean-Paul Sartre dans la capitale française";
    const year = 1980;
    const description = "Jean-Paul Sartre, figure majeure de l'existentialisme et intellectuel engagé, décède à l'hôpital Broussais à Paris des suites d'un œdème pulmonaire. Son décès marque la fin d'une époque intellectuelle et politique, laissant un vide immense dans le paysage philosophique français et international. Simone de Beauvoir, sa compagne de toujours, est présente à ses côtés.";

    console.log(`🚀 Isolation de l'événement : ${title}`);

    const { data, error } = await supabase
        .from('queue_sevent')
        .insert([
            {
                titre: title,
                year: year,
                type: "Arts & Culture",
                region: "Paris",
                description: description,
                status: 'pending'
            }
        ])
        .select();

    if (error) {
        console.error('❌ Erreur lors de l\'isolation :', error.message);
    } else {
        console.log('✅ Événement isolé dans queue_sevent :', data[0]);
    }
}

isolateSartre();
