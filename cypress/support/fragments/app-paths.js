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
  getLoanDetailsPath(userId, loanId) {
    return `${this.getLoansPath(userId)}/view/${loanId}`;
  },
  getChargePath: (userId) => `${getUserPath(userId)}/charge`,
  getUserPreviewPath:(userId) => `${topMenu.usersPath}/preview/${userId}`,
};
