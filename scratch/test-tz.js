
const dateStr = "2026-04-29T00:14:00Z"; // Created at 21:14 on the 28th in SP
const d = new Date(dateStr);

console.log("UTC String:", d.toISOString());

const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

console.log("Sao Paulo Format:", formatter.format(d));

const dateOnlyFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

console.log("Sao Paulo Date Only:", dateOnlyFormatter.format(d));
