import moment from 'moment';
import getRandomStringCode from './generateTextCode';

const padWithZero = (value) => String(value).padStart(2, '0');
const currentStartDate = new Date();
currentStartDate.setDate(currentStartDate.getDate());
const currentEndDate = new Date();
currentEndDate.setDate(currentEndDate.getDate() + 4);

const dateUTCFromHHMM = (t) => {
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(0, 0, 0, timeParts[0], timeParts[1]));
};

const toStartOfDay = (d) => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const padWithZeroDay = (value) => {
  return value < 10 ? `0${value}` : value;
};

export default {
  padWithZero,
  padWithZeroDay,
  getCurrentDate: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },

  getCurrentDateINDDMMYYYYFormat: () => {
    const currentDate = new Date();

    const day = currentDate.getDate().toString().padStart(2, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const year = currentDate.getFullYear();

    return `${day}/${month}/${year}`;
  },

  getCurrentDateForFileNaming: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}_${padWithZero(
      currentDate.getDate(),
    )}_${currentDate.getFullYear()}`;
  },

  getCurrentDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate(),
    )}`;
  },

  getCurrentDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },

  getCurrentDateInPreviousMonthForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },

  getCurrentDateInPreviousMonthForFiscalYearOnDDMMYYYYFormat: () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return `${padWithZero(currentDate.getDate())}/${padWithZero(
      currentDate.getMonth() + 1,
    )}/${currentDate.getFullYear()}`;
  },

  getRandomFiscalYearCodeForRollover: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return (
      'FYTA' +
      Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min)).toString()
    );
  },

  getPreviousDayDate: () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (today.getMonth() !== yesterday.getMonth()) {
      yesterday.setMonth(yesterday.getMonth());
    }

    const month = yesterday.getMonth() + 1;
    const day = yesterday.getDate();
    const year = yesterday.getFullYear();
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  },

  getPreviousDayDateInDDMMYYYYFormat: () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const day = yesterday.getDate().toString().padStart(2, '0');
    const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
    const year = yesterday.getFullYear();

    return `${day}/${month}/${year}`;
  },

  getTomorrowDayDateForFiscalYear: () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (today.getMonth() !== tomorrow.getMonth()) {
      tomorrow.setMonth(tomorrow.getMonth());
    }

    const month = tomorrow.getMonth() + 1;
    const day = tomorrow.getDate();
    const year = tomorrow.getFullYear();
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  },

  getDayAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get2DaysAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get3DaysAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get4DaysAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get5DaysAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get7DaysAfterTomorrowDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  get2DaysAfterTomorrowDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 3);
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },

  get2DaysAfterTomorrowDateForFiscalYearOnDDMMYYYY: () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 3);
    return `${padWithZero(
      currentDate.getDate(),
    )}/${padWithZero(currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;
  },

  get4DaysAfterTomorrowDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 5);
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },
  get3DaysAfterTomorrowDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 4);
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate(),
    )}/${currentDate.getFullYear()}`;
  },

  getSomeDaysAfterTomorrowDateForFiscalYear: (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days + 1);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  getDayTomorrowDateForFiscalYear: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${padWithZero(date.getMonth() + 1)}-${padWithZero(
      date.getDate(),
    )}`;
  },

  getDayTomorrowDateForFiscalYearOnUIEdit: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      `${padWithZero(tomorrow.getMonth() + 1)}/` +
      `${padWithZero(tomorrow.getDate())}/` +
      `${tomorrow.getFullYear()}`
    );
  },

  getDayTomorrowDateForFiscalYearOnMMDDYYYYFormat: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      `${padWithZero(tomorrow.getMonth() + 1)}/` +
      `${padWithZero(tomorrow.getDate())}/` +
      `${tomorrow.getFullYear()}`
    );
  },

  getPreviousDayDateForFiscalYear: () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate(),
    )}`;
  },

  getPreviousDayDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 1;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 1, 0);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getPreviousDayDateForFiscalYearOnMMDDYYYY: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 1;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 1, 0);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getTwoPreviousDaysDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  getTwoPreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 2;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 1, 0);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;

      if (day <= 0) {
        const prevMonth = new Date(year, month - 2, 0);
        year = prevMonth.getFullYear();
        month = prevMonth.getMonth() + 1;
        day = prevMonth.getDate() + day;
      }
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getTwoPreviousDaysDateForFiscalYearOnMMDDYYYYFormat: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 2;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 1, 0);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;

      if (day <= 0) {
        const prevMonth = new Date(year, month - 2, 0);
        year = prevMonth.getFullYear();
        month = prevMonth.getMonth() + 1;
        day = prevMonth.getDate() + day;
      }
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getThreePreviousDaysDateForFiscalYear: () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return `${d.getFullYear()}-${padWithZero(d.getMonth() + 1)}-${padWithZero(d.getDate())}`;
  },

  getThreePreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate();
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();

    if (day <= 3) {
      const lastMonth = new Date(year, month - 1, 0);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() - (3 - day);
    } else {
      day -= 3;
    }

    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getPreviousFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear() - 1).toString();
  },

  getCurrentFiscalYearCode: () => {
    return 'FY' + new Date().getFullYear().toString();
  },

  getRandomFiscalYearCode: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return (
      getRandomStringCode(4) +
      Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min)).toString()
    );
  },

  getRandomFiscalYearCodeFY: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return (
      'FY' +
      getRandomStringCode(2) +
      Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min)).toString()
    );
  },

  getDateRanges: (rangesCount = 1, isInDifferentYears = false) => {
    const resultRanges = [];
    const currentDate = new Date();
    const rangeLength = 7;

    for (let i = 0; i < rangesCount; i++) {
      const specialRange = {
        startDay: new Date(currentDate),
        endDay: new Date(currentDate),
      };
      specialRange.startDay.setDate(currentDate.getDate() - (i + 1) * rangeLength + 1);
      specialRange.endDay.setDate(currentDate.getDate() - i * rangeLength);
      resultRanges.push(specialRange);
      if (isInDifferentYears) {
        currentDate.setFullYear(currentDate.getFullYear() - 1);
      }
    }
    return resultRanges;
  },

  parseDateFromFilename(dateString) {
    const dateFormat = /\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}/gm;
    const date = dateString.match(dateFormat)[0];
    return Date.parse(date.replaceAll('_', ':'));
  },

  verifyDate(actualDate, timeInterval = 60000) {
    expect(actualDate).to.be.greaterThan(Date.now() - timeInterval);
    expect(actualDate).to.be.lessThan(Date.now() + timeInterval);
  },

  // Formats date as YYYY-MM-DD or MM/DD/YYYY
  getFormattedDate({ date }, type = 'YYYY-MM-DD') {
    if (type === 'MM/DD/YYYY') {
      return `${padWithZero(date.getMonth() + 1)}/${padWithZero(
        date.getDate(),
      )}/${date.getFullYear()}`;
    }
    if (type === 'DD/MM/YYYY') {
      return `${padWithZero(date.getDate())}/${padWithZero(
        date.getMonth() + 1,
      )}/${date.getFullYear()}`;
    }
    if (type === 'M/D/YYYY') {
      return moment.utc(date).format('M/D/YYYY');
    }
    if (type === 'YYYY/MM/DD') {
      return moment.utc(date).format('YYYY/MM/DD');
    }
    return `${date.getFullYear()}-${padWithZero(date.getMonth() + 1)}-${padWithZero(
      date.getDate(),
    )}`;
  },
  // Formats date as MM/DD/YYYY without zeros - used in settings
  getFormattedDateWithSlashes({ date }) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  },
  clearPaddingZero(initialString) {
    return initialString.replaceAll(/0([1-9])\//g, '$1/');
  },

  getLastWeekDateObj() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  },

  getCurrentDay() {
    return new Date().getDate().toString();
  },

  getTomorrowDay() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  },

  addDays(days, date = new Date()) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
  },

  getFutureWeekDateObj() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  },

  getAfterThreeMonthsDateObj() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
  },

  getFormattedEndDateWithTime(date) {
    const momentObj = moment(date);
    return momentObj.format('M/D/YYYY, h:mm A');
  },

  getFormattedEndDateWithTimUTC(date, noComma = false) {
    if (noComma) return moment.utc(date).format('M/D/YYYY h:mm A');
    return moment.utc(date).format('M/D/YYYY, h:mm A');
  },

  getFormattedDateWithTime(date, spelling = { withoutComma: false, withSpace: false }) {
    if (spelling.withoutComma) return moment.utc(date).format('M/D/YYYYh');
    if (spelling.withSpace) return moment.utc(date).format('M/D/YYYY h');
    return moment.utc(date).format('M/D/YYYY, h');
  },

  getCurrentEndOfDay() {
    return moment.utc().endOf('day');
  },

  getUTCDateForScheduling() {
    const today = new Date();
    let hours = today.getUTCHours();
    let minutes = today.getUTCMinutes() + 2;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours %= 12;
    hours = hours || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
    // return value in format HH:MM AM/PM
  },
  getUTCDateFor2Scheduling() {
    const today = new Date();
    let hours = today.getUTCHours();
    let minutes = today.getUTCMinutes() + 3;
    const ampm = hours >= 12 ? 'P' : 'A';
    hours %= 12;
    hours = hours || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
    // return value in format HH:MM AM/PM
  },

  uiCalendar: {
    dateToTimeOnly(d) {
      return new Date(0, 0, 0, d.getHours(), d.getMinutes());
    },

    dateFromHHMM(t) {
      const timeParts = t.split(':').map((n) => parseInt(n, 10));
      return new Date(0, 0, 0, timeParts[0], timeParts[1]);
    },

    toStartOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    dateFromYYYYMMDD(d) {
      const parts = d.split('-').map((n) => parseInt(n, 10));
      return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    getLocalizedDate(date) {
      const [year, month, day] = date.split('-');
      return `${month[0] === '0' ? month.slice(1) : month}/${
        day[0] === '0' ? day.slice(1) : day
      }/${year}`;
    },

    dateUTCFromHHMM,

    getLocalizedTime(time) {
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

      return `${hours.toString(10)}:${('0' + date.getUTCMinutes().toString(10)).slice(
        -2,
      )} ${meridian}`;
    },

    dateFromYYYYMMDDAndHHMM(d, t) {
      const dateParts = d.split('-').map((n) => parseInt(n, 10));
      const timeParts = t.split(':').map((n) => parseInt(n, 10));
      return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    },

    getRelativeDateProximity(test, referenceDate) {
      // ensure every time is midnight
      const testDate = toStartOfDay(test);
      // same day
      const testSameDayReference = toStartOfDay(referenceDate);
      if (testDate <= testSameDayReference) return 'sameDay';

      // check day after (for tomorrow)
      const testNextDayReference = new Date(
        toStartOfDay(referenceDate).setDate(testSameDayReference.getDate() + 1),
      );
      if (testDate <= testNextDayReference) return 'nextDay';

      // check next six days
      // does not check 7 as, for example, saying "closing Monday at 5:00"
      // is ambiguous if it currently is Monday.
      const testNextWeekReference = new Date(
        toStartOfDay(referenceDate).setDate(testSameDayReference.getDate() + 6),
      );
      if (testDate <= testNextWeekReference) return 'nextWeek';

      return 'sameElse';
    },

    dateFromDateAndHHMM(d, t) {
      const timeParts = t.split(':').map((n) => parseInt(n, 10));
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), timeParts[0], timeParts[1]);
    },
  },

  getCurrentUTCTime() {
    const currentDate = new Date();
    const options = {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'UTC',
    };
    const formattedTime = currentDate.toLocaleString('en-US', options);
    return formattedTime;
  },

  getCurrentDateYYMMDD() {
    const initialCurrentDate = new Date();
    return `${initialCurrentDate.getFullYear().toString().substring(2)}${padWithZero(
      initialCurrentDate.getMonth() + 1,
    )}${padWithZero(initialCurrentDate.getDate())}`;
  },

  getCurrentDateYYYYMMDD() {
    const initialCurrentDate = new Date();
    return `${initialCurrentDate.getFullYear().toString()}${padWithZero(
      initialCurrentDate.getMonth() + 1,
    )}${padWithZero(initialCurrentDate.getDate())}`;
  },

  editFromDateRange() {
    return `${(currentStartDate.getMonth() + 1).toString().padStart(2, '0')}
                      ${currentStartDate.getDate().toString().padStart(2, '0')}/
                      ${currentStartDate.getFullYear()}`;
  },

  editEndDateRange() {
    return `${(currentEndDate.getMonth() + 1).toString().padStart(2, '0')}
                      ${currentEndDate.getDate().toString().padStart(2, '0')}/
                      ${currentEndDate.getFullYear()}`;
  },

  convertMachineReadableDateToHuman(dateString) {
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are zero-based
    const day = parseInt(dateString.substring(6, 8), 10);
    const hours = parseInt(dateString.substring(8, 10), 10);
    const minutes = parseInt(dateString.substring(10, 12), 10);
    const seconds = parseInt(dateString.substring(12, 14), 10);
    const milliseconds = parseInt(dateString.substring(15, 18), 10);

    const dateObject = new Date(year, month, day, hours, minutes, seconds, milliseconds);
    return dateObject;
  },

  getCurrentISO8601TimestampUpToMinutesUTC(offsetMinutes = 0) {
    // Formats date as yyyymmddhhmm
    const now = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}`;
  },

  getCurrentDateForOaiPmh(offsetMinutes = 0) {
    // Format date as YYYY-MM-DDTHH:mm:ssZ
    const now = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  },

  getCurrentDateTimeForFundsExpenseClasses() {
    // Format date as fund-codes-export-FY2024-YYYY-MM-DD-HH_mm
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}_${minutes}`;
  },

  getFormattedDateTimeWithSeconds() {
    return moment.utc().format('M/D/YYYY, h:mm:ss A');
  },

  getFullFiscalYearStartAndEnd(index = 0) {
    const currentYear = new Date().getFullYear();
    const year = currentYear + index;
    return {
      periodStart: `${year}-01-01T00:00:00.000Z`,
      periodEnd: `${year}-12-31T23:59:59.999Z`,
    };
  },
};
