import topMenu from './topMenu';

export default {
  // users
  getUserPath(userId) {
    return `${topMenu.usersPath}/${userId}`;
  },
  getLoansPath(userId) {
    return `${this.getUserPath(userId)}/loans`;
  },
  getOpenLoansPath(userId) {
    return `${this.getLoansPath(userId)}/open`;
  },
  getLoanDetailsPath(userId, loanId) {
    return `${this.getLoansPath(userId)}/view/${loanId}`;
  },
};
