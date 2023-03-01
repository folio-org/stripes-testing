import moment from 'moment';
import getRandomStringCode from './genereteTextCode';

const padWithZero = value => String(value).padStart(2, '0');

const dateUTCFromHHMM = (t) => {
  const timeParts = t.split(':').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(0, 0, 0, timeParts[0], timeParts[1]));
};

const toStartOfDay = (d) => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export default {
  padWithZero,
  getCurrentDate: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(currentDate.getDate())}/${currentDate.getFullYear()}`;
  },

  getCurrentDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(currentDate.getDate())}`;
  },


  getPreviousDayDate: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(currentDate.getDate() - 1)}/${currentDate.getFullYear()}`;
  },

  getTomorrowDayDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(currentDate.getDate() + 1)}`;
  },

  getDayAfterTomorrowDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(currentDate.getDate() + 2)}`;
  },

  getPreviousDayDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(currentDate.getDate() - 1)}`;
  },

  getPreviousFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear() - 1).toString();
  },

  getCurrentFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear()).toString();
  },

  getRandomFiscalYearCode: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return (getRandomStringCode(4)) + Math.floor((Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min))).toString();
  },

  getDateRanges: (rangesCount = 1, isInDifferentYears = false) => {
    const resultRanges = [];
    const currentDate = new Date();
    const rangeLength = 7;

    for (let i = 0; i < rangesCount; i++) {
      const specialRange = {
        startDay: new Date(currentDate),
        endDay: new Date(currentDate)
      };
      specialRange.startDay.setDate(currentDate.getDate() - ((i + 1) * rangeLength) + 1);
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
      return `${padWithZero(date.getMonth() + 1)}/${padWithZero(date.getDate())}/${date.getFullYear()}`;
    }
    return `${date.getFullYear()}-${padWithZero(date.getMonth() + 1)}-${padWithZero(date.getDate())}`;
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

  getFormattedDateWithTime(date) {
    return moment.utc(date).format('M/D/YYYY, h:mm A');
  },

  getUTCDateForScheduling() {
    const today = new Date();
    let hours = today.getUTCHours();
    let minutes = today.getUTCMinutes() + 1;
    let ampm = hours >= 12 ? 'P' : 'A';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let utcTime = hours + ':' + minutes + ' ' + ampm;
    return utcTime;
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
      return `${month[0] === '0' ? month.slice(1) : month}/${day[0] === '0' ? day.slice(1) : day}/${year}`;
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

      return `${hours.toString(10)}:${('0' + date.getUTCMinutes().toString(10)).slice(-2)} ${meridian}`;
    },

    dateFromYYYYMMDDAndHHMM(d, t) {
      const dateParts = d.split('-').map((n) => parseInt(n, 10));
      const timeParts = t.split(':').map((n) => parseInt(n, 10));
      return new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        timeParts[0],
        timeParts[1]
      );
    },

    getRelativeDateProximity(test, referenceDate) {
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
    },

    dateFromDateAndHHMM(d, t) {
      const timeParts = t.split(':').map((n) => parseInt(n, 10));
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        timeParts[0],
        timeParts[1]
      );
    }
  }
};
