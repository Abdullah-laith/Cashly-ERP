const baghdadDateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' });
const baghdadTimeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: true });

export function formatBaghdadDateTime(value: string) {
  const date = new Date(value);
  const parts = baghdadDateFormatter.formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return { date: `${part('year')}/${part('month')}/${part('day')}`, time: formatBaghdadTime(value) };
}

export function formatBaghdadTime(value: string) {
  return baghdadTimeFormatter.format(new Date(value)).replace('AM', 'ص').replace('PM', 'م');
}
