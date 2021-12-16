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

  fileNames: {
    'saveSQLQuery': [22, 41],
    'saveUUIDs': [19, 38]
  },
  parseDateFromFilename(dateString, fileNameType) {
    // fileNameType: array of 2 values for slicing string for getting Date
    const sliceValue = fileNameType ?? this.fileNames.saveUUIDs;
    return Date.parse(dateString[dateString.length - 1].slice(...sliceValue).replaceAll('_', ':'));
  }
};
