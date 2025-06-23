import Permissions from '../../../support/dictionary/permissions';
import LoanAnonymization from '../../../support/fragments/settings/circulation/loanAnonymization';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  let testUser;

  before('Prepare test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiCirculationViewLoanHistory.gui,
      Permissions.uiCirculationEditLoanHistory.gui,
    ]).then(userProps => {
      testUser = userProps;
    });
    // Ensure loan is set to never before test
    LoanAnonymization.setLoanAnonymizationsViaApi({ closingType: { loan: 'never', feeFine: null, loanExceptions: [] } });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // Reset loan is set to never after test
    LoanAnonymization.setLoanAnonymizationsViaApi({ closingType: { loan: 'never', feeFine: null, loanExceptions: [] } });
    Users.deleteViaApi(testUser.userId);
  });

  it('C3616 Settings (Circ): Can view loan history (vega)',
    { tags: ['extendedPath', 'vega', 'C3616'] },
    () => {
      cy.login(testUser.username, testUser.password, {
        path: SettingsMenu.circulationLoanHistoryPath,
        waiter: LoanAnonymization.waitLoading
      });

      LoanAnonymization.selectImmediatelyAfterLoanClosesRadioButton();
      LoanAnonymization.saveLoanAnonymizations();

      InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
      cy.wait(2000).then(() => {
        // Verify loan is set to immediately via API
        LoanAnonymization.verifyLoanAnonymizationsContainsParams({ loan: 'immediately' });
      });
    });
});
