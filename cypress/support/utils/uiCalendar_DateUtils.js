/**
 * utility functions for ui-calendar automated UI testing
 */

export function dateToTimeOnly(d) {
  return new Date(0, 0, 0, d.getHours(), d.getMinutes());
}

export function dateFromHHMM(t) {
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(0, 0, 0, timeParts[0], timeParts[1]);
}


export function toStartOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateFromYYYYMMDD(d) {
  const parts = d.split('-').map((n) => parseInt(n, 10));
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// converts date from YYYY-MM-DD to MM/DD/YYYY
export function getLocalizedDate(date) {
  const [year, month, day] = date.split('-');
  return `${month[0] === '0' ? month.slice(1) : month}/${day[0] === '0' ? day.slice(1) : day}/${year}`;
}

export function dateUTCFromHHMM(t) {
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(0, 0, 0, timeParts[0], timeParts[1]));
}

export function getLocalizedTime(time) {
  // forcibly use UTC for local time-ness
  const date = dateUTCFromHHMM(time);

  if (
    (date.getUTCHours() === 23 && date.getUTCMinutes() === 59) ||
    (date.getUTCHours() === 0 && date.getUTCMinutes() === 0)
  ) {
    return 'Midnight';
  }


  let meridian = 'AM';

  let hours = date.getUTCHours();

  if (hours > 11) {
    meridian = 'PM';
  }

  if (hours > 12) {
    hours -= 12;
  }

  return `${hours.toString(10)}:${('0' + date.getUTCMinutes().toString(10)).slice(-2)} ${meridian}`;
}


export function dateFromYYYYMMDDAndHHMM(d, t) {
  const dateParts = d.split('-').map((n) => parseInt(n, 10));
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0],
    timeParts[1]
  );
}


export function getRelativeDateProximity(
  test,
  referenceDate
) {
  // ensure every time is midnight
  const testDate = toStartOfDay(test);
  // same day
  const testSameDayReference = toStartOfDay(referenceDate);
  if (testDate <= testSameDayReference) return 'sameDay';

  // check day after (for tomorrow)
  const testNextDayReference = new Date(
    toStartOfDay(referenceDate).setDate(testSameDayReference.getDate() + 1)
  );
  if (testDate <= testNextDayReference) return 'nextDay';

  // check next six days
  // does not check 7 as, for example, saying "closing Monday at 5:00"
  // is ambiguous if it currently is Monday.
  const testNextWeekReference = new Date(
    toStartOfDay(referenceDate).setDate(testSameDayReference.getDate() + 6)
  );
  if (testDate <= testNextWeekReference) return 'nextWeek';

  return 'sameElse';
}


export function dateFromDateAndHHMM(d, t) {
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    timeParts[0],
    timeParts[1]
  );
}








