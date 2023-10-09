import topMenu from './topMenu';

const getUserPath = (userId) => `${topMenu.usersPath}/${userId}`;

export default {
  // users
  getLoansPath(userId) {
    return `${getUserPath(userId)}/loans`;
  },
  getOpenLoansPath(userId) {
    return `${this.getLoansPath(userId)}/open`;
  },
  getClosedLoansPath(userId) {
    return `${this.getLoansPath(userId)}/closed`;
  },
  getLoanDetailsPath(userId, loanId) {
    return `${this.getLoansPath(userId)}/view/${loanId}`;
  },
  getChargePath: (userId) => `${getUserPath(userId)}/charge`,
  getUserPreviewPath: (userId) => `${topMenu.usersPath}/preview/${userId}`,
  getUserPreviewPathWithQuery: (userId) => `${topMenu.usersPath}/preview/${userId}?query=${userId}`,
  getFeeFineDetailsPath: (userId, accountId) => `${getUserPath(userId)}/accounts/view/${accountId}`,
  getOpenFeeFinePath: (userId) => `${getUserPath(userId)}/accounts/open`,
};
