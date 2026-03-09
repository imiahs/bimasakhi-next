const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function startImport(filePath) {
    console.log(`Starting Pincode Import from ${filePath}...`);

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isFirstLine = true;
    let successCount = 0;

    // Simple naive CSV parser expecting: city_name,state,locality_name,pincode
    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue; // Skip header
        }

        const [city_name, state, locality_name, pincode] = line.split(',').map(s => s?.trim());

        if (!city_name || !locality_name || !pincode) continue;

        const citySlug = generateSlug(city_name);
        const localitySlug = generateSlug(locality_name);

        try {
            // Upsert mechanism manually mapped to maintain foreign keys

            // 1. Get/Create City
            let cityId;
            const { data: cityData } = await supabase.from('cities').select('id').eq('slug', citySlug).single();
            if (cityData) {
                cityId = cityData.id;
            } else {
                const { data: newCity, error: cityErr } = await supabase.from('cities').insert({ city_name, state, slug: citySlug, active: true }).select('id').single();
                if (cityErr) { console.error("City Error:", cityErr.message); continue; }
                cityId = newCity.id;
            }

            // 2. Get/Create Locality
            let localityId;
            const { data: locData } = await supabase.from('localities').select('id').eq('city_id', cityId).eq('slug', localitySlug).single();
            if (locData) {
                localityId = locData.id;
            } else {
                const { data: newLoc, error: locErr } = await supabase.from('localities').insert({ city_id: cityId, locality_name, slug: localitySlug, active: true }).select('id').single();
                if (locErr) { console.error("Locality Error:", locErr.message); continue; }
                localityId = newLoc.id;
            }

            // 3. Create Pincode natively
            const { error: pinErr } = await supabase.from('pincodes').insert({ locality_id: localityId, pincode, active: true });
            if (!pinErr) {
                successCount++;
                if (successCount % 100 === 0) console.log(`Imported ${successCount} locations natively...`);
            } else if (pinErr.code !== '23505') { // Not unique constraint violation
                console.error("Pincode Error:", pinErr.message);
            }

        } catch (err) {
            console.error("Line Error:", line, err);
        }
    }

    console.log(`\nImport Process Completed. Successfully mapped ${successCount} node chains.`);
}

// Ensure the scripts directory exists, execute with a test payload path
const targetFile = process.argv[2];
if (!targetFile) {
    console.log('Usage: node import-pincodes.js <path_to_csv>');
    process.exit(1);
}

startImport(targetFile);
