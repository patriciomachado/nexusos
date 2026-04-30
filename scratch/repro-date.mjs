import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';
const rawDate = '2026-04-29T00:14:00Z'; // 21:14 on 28/04 in Sao Paulo

const d = new Date(rawDate);
console.log('Raw:', rawDate);
console.log('Date Object (UTC):', d.toISOString());
console.log('Formatted (America/Sao_Paulo):', formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"));

const rawNoZ = '2026-04-29T00:14:00'; 
const d2 = new Date(rawNoZ);
console.log('Raw (No Z):', rawNoZ);
console.log('Date Object (UTC from No Z):', d2.toISOString());
console.log('Formatted (America/Sao_Paulo from No Z):', formatInTimeZone(d2, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"));
