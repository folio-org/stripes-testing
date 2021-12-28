export default {
  getCurrentDate: () => {
    const currentDate = new Date();
    const replacer = (val) => String(val).padStart(2, 0);
    return `${replacer(currentDate.getMonth() + 1)}/${replacer(currentDate.getDate())}/${currentDate.getFullYear()}`;
  },

  getPreviousDayDate: () => {
    const currentDate = new Date();
    const replacer = (val) => String(val).padStart(2, 0);
    return `${replacer(currentDate.getMonth() + 1)}/${replacer(currentDate.getDate() - 1)}/${currentDate.getFullYear()}`;
  },

  getPreviousFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear() - 1).toString();
  },

  getCurrentFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear()).toString();
  },

  getRandomFiscalYearCode: (min, max) => {
    // returns random 4 digit code for the Fiscal Year
    return 'FY' + Math.floor((Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min))).toString();
  },

  parseDateFromFilename(dateString) {
    const dateFormat = /\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}/gm;
    const date = dateString.match(dateFormat)[0];
    return Date.parse(date.replaceAll('_', ':'));
  }
};
