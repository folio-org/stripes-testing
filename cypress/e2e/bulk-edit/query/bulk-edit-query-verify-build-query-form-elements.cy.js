import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';

let user;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    // Trillium
    it.skip('C377049 Verify elements on the "Build query" form (firebird)', { tags: [] }, () => {
      // Step 1: Click "Query" tab in the top left corner
      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.recordTypesAccordionExpanded();
      BulkEditSearchPane.isUsersRadioChecked(false);
      BulkEditSearchPane.verifyInputLabel(
        'Select a record type and then click the Build query button.',
      );
      BulkEditSearchPane.isBuildQueryButtonDisabled(true);

      // Step 2: Select "Users" radio button and click "Build query" button
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.isUsersRadioChecked(true);
      BulkEditSearchPane.isBuildQueryButtonDisabled(false);
      BulkEditSearchPane.clickBuildQueryButton();
      QueryModal.verify();
      QueryModal.verifyBuildQueryInFullScreenMode();
      QueryModal.verifyRecordTypeLabel('Users');

      // Step 3: Click on the resizable "Query" textbox and try to type something into it
      QueryModal.verifyQueryTextboxReadOnly();
      QueryModal.verifyQueryTextboxResizable();

      // Step 4: Click "+" button in "Actions" column to add new row
      QueryModal.addNewRow();
      QueryModal.verifyBooleanColumn(1);
      QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
      QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
      QueryModal.verifyQueryAreaContent(' AND (  )');
      QueryModal.testQueryDisabled(true);
      QueryModal.runQueryDisabled(true);

      // Step 5: Click on the garbage icon near the recently added row
      QueryModal.clickGarbage(1);
      QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);

      // Step 6: Click on the "Cancel" button on the "Build query" modal window
      QueryModal.clickCancel();
      QueryModal.verifyClosed();
    });
  });
});
