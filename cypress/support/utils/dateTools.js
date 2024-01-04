import moment from 'moment';
import getRandomStringCode from './genereteTextCode';

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
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() + 2,
    )}`;
  },

  get2DaysAfterTomorrowDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() + 3,
    )}`;
  },

  get2DaysAfterTomorrowDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate() + 3,
    )}/${currentDate.getFullYear()}`;
  },

  getSomeDaysAfterTomorrowDateForFiscalYear: (days) => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() + days,
    )}`;
  },

  getDayTomorrowDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() + 1,
    )}`;
  },

  getDayTomorrowDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate() + 1,
    )}/${currentDate.getFullYear()}`;
  },

  getPreviousDayDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() - 1,
    )}`;
  },

  getPreviousDayDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 1;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 2, 1);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getTwoPreviousDaysDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() - 2,
    )}`;
  },

  getTwoPreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate() - 2;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if (day <= 0) {
      const lastMonth = new Date(year, month - 2, 1);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = lastMonth.getDate() + day;
    }
    return `${padWithZeroDay(month)}/${padWithZeroDay(day)}/${year}`;
  },

  getThreePreviousDaysDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() - 3,
    )}`;
  },

  getThreePreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    let day = currentDate.getDate();
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();

    if (day <= 3) {
      const lastMonth = new Date(year, month - 2, 1);
      year = lastMonth.getFullYear();
      month = lastMonth.getMonth() + 1;
      day = 30;
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

  getFormattedDateWithTime(date, spelling = { withoutComma: false, withSpace: false }) {
    if (spelling.withoutComma) return moment.utc(date).format('M/D/YYYYh:mm A');
    if (spelling.withSpace) return moment.utc(date).format('M/D/YYYY h:mm A');
    return moment.utc(date).format('M/D/YYYY, h:mm A');
  },

  getCurrentEndOfDay() {
    return moment.utc().endOf('day');
  },

  getUTCDateForScheduling() {
    const today = new Date();
    let hours = today.getUTCHours();
    let minutes = today.getUTCMinutes() + 2;
    const ampm = hours >= 12 ? 'P' : 'A';
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
};
