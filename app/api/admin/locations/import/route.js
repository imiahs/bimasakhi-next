import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// Helper to generate a basic slug
function generateSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

export const POST = withAdminAuth(async (request, user) => {
    if (process.env.SUPABASE_ENABLED !== 'true') {
        return NextResponse.json({ error: 'Database operations are currently disabled.' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const { dataset } = body; // Expecting an array of objects: { city_name, state, locality_name, pincode }

        if (!dataset || !Array.isArray(dataset)) {
            return NextResponse.json({ error: 'Invalid payload. Expected JSON array of locations.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        let importedCount = 0;
        let skippedCount = 0;

        for (const row of dataset) {
            if (!row.city_name || !row.locality_name || !row.pincode) continue;

            const citySlug = generateSlug(row.city_name);
            const localitySlug = generateSlug(row.locality_name);

            // 1. Insert or Get City
            let { data: city, error: cityError } = await supabase
                .from('cities')
                .select('id')
                .eq('slug', citySlug)
                .single();

            if (!city) {
                const { data: newCity, error: insertCityError } = await supabase
                    .from('cities')
                    .insert({ city_name: row.city_name, state: row.state || '', slug: citySlug, active: true })
                    .select('id')
                    .single();

                if (insertCityError) {
                    skippedCount++;
                    continue;
                }
                city = newCity;
            }

            // 2. Insert or Get Locality
            let { data: locality, error: localityError } = await supabase
                .from('localities')
                .select('id')
                .eq('city_id', city.id)
                .eq('slug', localitySlug)
                .single();

            if (!locality) {
                const { data: newLocality, error: insertLocError } = await supabase
                    .from('localities')
                    .insert({ city_id: city.id, locality_name: row.locality_name, slug: localitySlug, active: true })
                    .select('id')
                    .single();

                if (insertLocError) {
                    skippedCount++;
                    continue;
                }
                locality = newLocality;
            }

            // 3. Insert Pincode (Duplicate handled via constraint gracefully)
            const { error: pincodeError } = await supabase
                .from('pincodes')
                .insert({ locality_id: locality.id, pincode: row.pincode, active: true });

            if (pincodeError && pincodeError.code !== '23505') { // Ignore unique violation explicitly
                skippedCount++;
            } else {
                importedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Import complete. Imported: ${importedCount}, Skipped/Duplicates: ${skippedCount}`
        });

    } catch (error) {
        console.error('Import engine error:', error);
        return NextResponse.json({ error: 'Internal server error during import.' }, { status: 500 });
    }
});
