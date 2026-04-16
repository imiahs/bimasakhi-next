import re

with open('pages/api/crm/[action].js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace pagegenDispatchNeeded = false; with queueIdsToDispatch
content = re.sub(
    r'let pagegenDispatchNeeded = false;',
    'let queueIdsToDispatch = [];',
    content,
    count=1
)

# City insert replacement
city_target = r"await supabase\.from\('generation_queue'\)\.insert\(\{\s*task_type: 'pagegen',\s*status: 'pending',\s*progress: 0,\s*total_items: 1,\s*payload: \{\s*version: 1,\s*priority: 1,\s*created_by: 'crm_auto',\s*pages: \[\{\s*slug: citySlug,\s*city_name: city\.trim\(\), // Pass city name explicitly\s*keyword_text: `LIC Agent Job in \$\{city\.trim\(\)\}`,\s*city_id: targetCityId,\s*page_type: 'city_page',\s*content_level: 'city'\s*\}\]\s*\}\s*\}\);"

city_replacement = """const { data: qCity } = await supabase.from('generation_queue').insert({
                                        task_type: 'pagegen',
                                        status: 'pending',
                                        progress: 0,
                                        total_items: 1,
                                        payload: {
                                            version: 1,
                                            priority: 1,
                                            created_by: 'crm_auto',
                                            pages: [{
                                                slug: citySlug,
                                                city_name: city.trim(), // Pass city name explicitly
                                                keyword_text: `LIC Agent Job in ${city.trim()}`,
                                                city_id: targetCityId,
                                                page_type: 'city_page',
                                                content_level: 'city'
                                            }]
                                        }
                                    }).select('id').single();

                                    if (qCity?.id) queueIdsToDispatch.push(qCity.id);"""

content = re.sub(city_target, city_replacement, content, count=1)

# Remove pagegenDispatchNeeded = true; for City
content = re.sub(
    r'console\.log\(`\[Pipeline\] Queued city page: \$\{citySlug\}`\);\s*pagegenDispatchNeeded = true;',
    'console.log(`[Pipeline] Queued city page: ${citySlug}`);',
    content,
    count=1
)

# Locality insert replacement
loc_target = r"await supabase\.from\('generation_queue'\)\.insert\(\{\s*task_type: 'pagegen',\s*status: 'pending',\s*progress: 0,\s*total_items: 1,\s*payload: \{\s*version: 1,\s*priority: 2,\s*created_by: 'crm_auto',\s*pages: \[\{\s*slug: localitySlug,\s*city_name: city\.trim\(\),\s*keyword_text: `LIC Bima Sakhi Career Agency opportunity in \$\{locality\.trim\(\)\} \$\{city\.trim\(\)\}`,\s*city_id: targetCityId,\s*page_type: 'locality_page',\s*content_level: 'locality'\s*\}\]\s*\}\s*\}\);"

loc_replacement = """const { data: qLoc } = await supabase.from('generation_queue').insert({
                                            task_type: 'pagegen',
                                            status: 'pending',
                                            progress: 0,
                                            total_items: 1,
                                            payload: {
                                                version: 1,
                                                priority: 2,
                                                created_by: 'crm_auto',
                                                pages: [{
                                                    slug: localitySlug,
                                                    city_name: city.trim(),
                                                    keyword_text: `LIC Bima Sakhi Career Agency opportunity in ${locality.trim()} ${city.trim()}`,
                                                    city_id: targetCityId,
                                                    page_type: 'locality_page',
                                                    content_level: 'locality'
                                                }]
                                            }
                                        }).select('id').single();

                                        if (qLoc?.id) queueIdsToDispatch.push(qLoc.id);"""

content = re.sub(loc_target, loc_replacement, content, count=1)

# Remove pagegenDispatchNeeded = true; for Locality
content = re.sub(
    r'console\.log\(`\[Pipeline\] Queued locality page: \$\{localitySlug\}`\);\s*pagegenDispatchNeeded = true;',
    'console.log(`[Pipeline] Queued locality page: ${localitySlug}`);',
    content,
    count=1
)

# Dispatch replacement
dispatch_target = r"if \(pagegenDispatchNeeded\) \{\s*enqueuePageGeneration\(\{\s*source: 'crm_auto',\s*trigger_slug: locality && locality\.trim\(\)\s*\?\s*`lic-agent-in-\$\{locality\.trim\(\)\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g, '-'\)\}-\$\{cleanCity\}`\s*:\s*citySlug\s*\}\)\.catch\(\(e\) => console\.error\(\"Auto trigger error:\", e\)\);\s*\}"

dispatch_replacement = """if (queueIdsToDispatch.length > 0) {
                                    for (const qId of queueIdsToDispatch) {
                                        enqueuePageGeneration({ queueId: qId }).catch((e) => console.error("Auto trigger error:", e));
                                    }
                                }"""
content = re.sub(dispatch_target, dispatch_replacement, content, count=1)

with open('pages/api/crm/[action].js', 'w', encoding='utf-8') as f:
    f.write(content)
