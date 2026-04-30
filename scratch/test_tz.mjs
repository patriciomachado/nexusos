process.env.TZ = 'America/Sao_Paulo';
console.log('TZ set to:', process.env.TZ);
console.log('Current time:', new Date().toString());
console.log('ISO string:', new Date().toISOString());
