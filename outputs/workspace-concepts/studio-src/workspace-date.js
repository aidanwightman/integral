// A datetime-local value denotes browser time. A timestamp with an explicit offset denotes an instant.
export function parseWorkspaceDateTime(value) {
 const text=String(value||''),parts=text.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(?:\.(\d{1,3}))?)?(Z|[+-]\d\d:\d\d)?$/);
 const date=new Date(text),day=new Date(text.slice(0,10)+'T00:00:00Z');
 if(!parts||!Number.isFinite(date.getTime())||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==text.slice(0,10)||Number(parts[4])>23||Number(parts[5])>59||Number(parts[6]||0)>59)throw new Error('Enter a valid date and time.');
 if(!parts[8]&&(date.getHours()!==Number(parts[4])||date.getMinutes()!==Number(parts[5])))throw new Error('This local time does not exist after the clock change. Choose another time.');
 return date;
}
