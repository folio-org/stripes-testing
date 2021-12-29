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
  }
  parseDateFromFilename(dateString) {
    const dateFormat = /\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}/gm;
    const date = dateString.match(dateFormat)[0];
    return Date.parse(date.replaceAll('_', ':'));
  }
};
