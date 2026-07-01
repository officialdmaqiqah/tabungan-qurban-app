const fs = require('fs');

const migration = fs.readFileSync('scripts/migration-wa-v2.sql', 'utf8');
fs.appendFileSync('supabase/schema.sql', '\n\n' + migration);
console.log('Appended migration to schema.sql');
