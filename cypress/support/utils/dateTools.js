import moment from 'moment';
import getRandomStringCode from './genereteTextCode';

const padWithZero = value => String(value).padStart(2, '0');

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

  getCurrentDateForFileNaming: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}_${padWithZero(currentDate.getDate())}_${currentDate.getFullYear()}`;
  },

  getPreviousDayDate: () => {
    const today = new Date();
    let yesterday = new Date(today);
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
    let tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
  
    if (today.getMonth() !== tomorrow.getMonth()) {
      tomorrow.setMonth(tomorrow.getMonth());
    }
  
    const month = tomorrow.getMonth() + 1;
    const day = tomorrow.getDate();
    const year = tomorrow.getFullYear();
    return`${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
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

  getRandomFiscalYearCodeForRollover: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return 'FYTA' + Math.floor((Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min))).toString();
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

  getAfterThreeMonthsDateObj() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
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
    return hours + ':' + minutes + ' ' + ampm;
    // return value in format HH:MM AM/PM
  },
};
