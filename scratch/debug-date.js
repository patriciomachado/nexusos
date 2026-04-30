const { formatInTimeZone } = require('date-fns-tz');

const TIMEZONE = 'America/Sao_Paulo';

function formatDate(date) {
    if (!date) return '-';
    // Use the logic from lib/utils.ts
    const d = typeof date === 'string' ? new Date(date) : date;
    console.log(`Input string: ${date}`);
    console.log(`Parsed Date (UTC): ${d.toISOString()}`);
    const formatted = formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    console.log(`Formatted for ${TIMEZONE}: ${formatted}`);
    return formatted;
}

console.log('--- Test 1: ISO with Z (UTC) ---');
formatDate('2026-04-29T00:14:00Z');

console.log('\n--- Test 2: ISO without Z (Local?) ---');
formatDate('2026-04-29T00:14:00');

console.log('\n--- Test 3: ISO with offset ---');
formatDate('2026-04-28T21:14:00-03:00');
