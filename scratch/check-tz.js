process.env.TZ = 'America/Sao_Paulo';
const now = new Date();
console.log('Now:', now.toString());
const startOfDay = new Date(now);
startOfDay.setHours(0, 0, 0, 0);
console.log('Start of Day:', startOfDay.toString());
console.log('Start of Day ISO:', startOfDay.toISOString());

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
console.log('Start of Month:', startOfMonth.toString());
console.log('Start of Month ISO:', startOfMonth.toISOString());
