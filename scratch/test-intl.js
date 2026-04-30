const date = new Date('2026-04-29T00:14:00Z');
console.log('UTC Date:', date.toISOString());
console.log('SP Formatted:', new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}).format(date));
