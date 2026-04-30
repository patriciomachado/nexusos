
const utcDateStr = "2026-04-29T00:14:00.000Z";
const d = new Date(utcDateStr);

const formatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}).format(d);

console.log('UTC String:', utcDateStr);
console.log('Parsed Date Object:', d.toString());
console.log('Formatted (Sao Paulo):', formatted);

// Check current time in Sao Paulo
const now = new Date();
const nowFormatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}).format(now);
console.log('Current Time (Sao Paulo):', nowFormatted);
