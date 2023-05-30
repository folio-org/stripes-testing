import uuid from 'uuid';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import FinancialTransactionDetailReportModal from '../../../support/fragments/users/financialTransactionDetailReportModal';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';


describe('Financial Transactions Detail Report', () => {
  const ownerData = {};

  before('UserOwner is created', () => {
    //the login with admin, visiting the path and the waiter are separated to get the fetch request to get owners
    cy.getAdminToken().then(() => {
      UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner(uuid(), 'owner')).then(({ id, ownerName }) => {
        ownerData.name = ownerName;
        ownerData.id = id;
      });
    }).then(() => {
      cy.loginAsAdmin();
      cy.visit(TopMenu.usersPath);
      UsersSearchResultsPane.waitLoading();
    });
  });

  after('UserOwner is removed', () => {
    UsersOwners.deleteViaApi(ownerData.id);
  });

  it('C343305 Check that the "Financial transactions detail report (CSV)" is displayed in "Actions"', { tags: [TestTypes.criticalPath, DevTeams.vega] }, () => {
    UsersSearchResultsPane.verifyOptionsInActionsMenu();
  });

  it('C343316 Check that the "Save&close" button has become active after filling in all the required fields with valid data', { tags: [TestTypes.criticalPath, DevTeams.vega] }, () => {
    UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
    FinancialTransactionDetailReportModal.fillInRequiredFields({ startDate: false, ownerName: ownerData.name });
    FinancialTransactionDetailReportModal.verifySaveButtonIsEnabled();
  });
});
