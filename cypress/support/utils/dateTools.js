export default {
  getCurrentDate: () => {
    const currentDate = new Date();
    const replacer = (val) => String(val).padStart(2, 0);
    return `${replacer(currentDate.getMonth() + 1)}/${replacer(currentDate.getDate())}/${currentDate.getFullYear()}`;
  },

  getPreviousFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear() - 1).toString();
  },

  getCurrentFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear()).toString();
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
