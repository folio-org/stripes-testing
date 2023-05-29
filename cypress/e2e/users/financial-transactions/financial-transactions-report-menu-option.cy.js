
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';


describe('Financial Transactions Detail Report', () => {
  before('User is authorized', () => {
    cy.loginAsAdmin({ path: TopMenu.usersPath, waiter:  UsersSearchResultsPane.waitLoading });
  });

  it('C343305 Check that the "Financial transactions detail report (CSV)" is displayed in "Actions"', { tags: [testTypes.criticalPath, devTeams.vega] }, () => {
    UsersSearchResultsPane.verifyOptionsInActionsMenu();
  });
});
