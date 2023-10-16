import moment from 'moment';
import getRandomStringCode from './genereteTextCode';

const padWithZero = (value) => String(value).padStart(2, '0');
const currentStartDate = new Date();
currentStartDate.setDate(currentStartDate.getDate());
const currentEndDate = new Date();
currentEndDate.setDate(currentEndDate.getDate() + 4);

export default {
  padWithZero,
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
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate() - 1,
    )}/${currentDate.getFullYear()}`;
  },

  getTwoPreviousDaysDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() - 2,
    )}`;
  },

  getTwoPreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate() - 2,
    )}/${currentDate.getFullYear()}`;
  },

  getThreePreviousDaysDateForFiscalYear: () => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${padWithZero(currentDate.getMonth() + 1)}-${padWithZero(
      currentDate.getDate() - 3,
    )}`;
  },

  getThreePreviousDaysDateForFiscalYearOnUIEdit: () => {
    const currentDate = new Date();
    return `${padWithZero(currentDate.getMonth() + 1)}/${padWithZero(
      currentDate.getDate() - 3,
    )}/${currentDate.getFullYear()}`;
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

  getFormattedDateWithTime(date) {
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
};
