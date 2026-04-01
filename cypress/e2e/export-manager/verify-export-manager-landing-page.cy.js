import permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

let user;

describe('Export Manager', () => {
  before('create user', () => {
    cy.createTempUser([permissions.exportManagerAll.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.exportManagerPath,
        waiter: ExportManagerSearchPane.waitLoading,
      });
    });
  });

  after('delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350726 Verify Export Manager landing page (firebird)',
    { tags: ['criticalPath', 'firebird', 'C350726'] },
    () => {
      // Step 1: Verify "All" tab is highlighted by default and default view
      ExportManagerSearchPane.checkDefaultView();

      // Step 2: Verify Search & filter pane with elements
      ExportManagerSearchPane.verifySearchButtonDisabled();
      ExportManagerSearchPane.verifySearchField();
      ExportManagerSearchPane.verifyResetAllButtonDisabled();

      // Step 3: Verify Status accordion (expanded by default)
      ExportManagerSearchPane.verifyStatusAccordion();

      // Step 4: Verify Job type accordion (expanded by default)
      ExportManagerSearchPane.verifyJobTypeAccordion();

      // Step 5: Verify System accordion (hidden, need to expand)
      ExportManagerSearchPane.verifySystemAccordion();

      // Step 6: Verify Source accordion (hidden, need to expand)
      ExportManagerSearchPane.verifySourceAccordion();

      // Step 7: Verify Start time accordion (hidden, need to expand)
      ExportManagerSearchPane.verifyStartTimeAccordion();

      // Step 8: Verify End time accordion (hidden, need to expand)
      ExportManagerSearchPane.verifyEndTimeAccordion();

      // Step 9: Switch to Organizations tab and verify
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.checkTabHighlighted({ tabName: 'Organizations' });
      ExportManagerSearchPane.checkNoResultsMessage();
      ExportManagerSearchPane.verifySearchButtonDisabled();
      ExportManagerSearchPane.verifySearchField();
      ExportManagerSearchPane.verifyResetAllButtonDisabled();

      // Step 10: Verify Status accordion in Organizations tab
      ExportManagerSearchPane.verifyStatusAccordion();

      // Step 11: Verify Integration type accordion (expanded by default)
      ExportManagerSearchPane.verifyIntegrationTypeAccordion();

      // Step 12: Verify Export method accordion (hidden, need to expand)
      ExportManagerSearchPane.verifyExportMethodAccordion();

      // Step 13: Verify Organization accordion (hidden, need to expand)
      ExportManagerSearchPane.verifyOrganizationAccordion();

      // Step 14: Verify System accordion in Organizations tab
      ExportManagerSearchPane.verifySystemAccordion();

      // Step 15: Verify Source accordion in Organizations tab
      ExportManagerSearchPane.verifySourceAccordion();

      // Step 16: Verify Start time accordion in Organizations tab
      ExportManagerSearchPane.verifyStartTimeAccordion();

      // Step 17: Verify End time accordion in Organizations tab
      ExportManagerSearchPane.verifyEndTimeAccordion();
    },
  );
});
