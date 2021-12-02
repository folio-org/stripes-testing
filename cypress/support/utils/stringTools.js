export default {
  getRandomPostfix: () => {
    return `${(Math.random() * 1000)
      .toString(10)}${new Date().getMilliseconds()}`;
  },

  getPreviousFiscalYearCode: () => {
    return 'FY' + (new Date().getFullYear() - 1).toString();
  }
};
