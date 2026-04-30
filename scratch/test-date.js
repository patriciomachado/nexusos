const { formatInTimeZone } = require('date-fns-tz');
const { parseISO } = require('date-fns');

const TIMEZONE = 'America/Sao_Paulo';

// Simulate Supabase response (UTC string)
const dateStr = '2026-04-29T00:14:00.000Z'; 
const d = parseISO(dateStr);

console.log('Input:', dateStr);
console.log('Date object (UTC):', d.toISOString());
console.log('Formatted in SP:', formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"));

// Simulate string without Z
const dateStrNoZ = '2026-04-29 00:14:00'; 
const d2 = new Date(dateStrNoZ); // Behavior depends on system TZ
console.log('\nInput (no Z):', dateStrNoZ);
try {
    console.log('Date object 2 (ISO):', d2.toISOString());
    console.log('Formatted 2 in SP:', formatInTimeZone(d2, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"));
} catch (e) {
    console.log('Error parsing d2:', e.message);
}

// What if we force it to be treated as UTC if it's a string?
function robustParse(date) {
    if (!date) return null;
    if (typeof date !== 'string') return date;
    
    // If it's a string and doesn't have a timezone indicator, append Z
    if (date.includes(' ') && !date.includes('T')) {
        date = date.replace(' ', 'T');
    }
    if (!date.includes('Z') && !date.includes('+') && !date.includes('-')) {
        date = date + 'Z';
    }
    return new Date(date);
}

const d3 = robustParse('2026-04-29 00:14:00');
console.log('\nRobust Parse (no Z -> force Z):', d3.toISOString());
console.log('Formatted 3 in SP:', formatInTimeZone(d3, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"));
