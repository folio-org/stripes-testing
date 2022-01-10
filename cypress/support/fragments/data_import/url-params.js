export default {
  getDateQueryString({ from, end }) {
    return `completedAfter=${from}&completedBefore=${end}&limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR`;
  },

  getSingleJobProfileQueryString() {
    return 'limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR';
  }
};
