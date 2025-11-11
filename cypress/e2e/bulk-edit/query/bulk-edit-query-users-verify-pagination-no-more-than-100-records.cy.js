import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames } from '../../../support/constants';

let user;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUsersCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.patronGroup);
        QueryModal.verifySelectedField(usersFieldValues.patronGroup);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(patronGroupNames.STAFF);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.barcode, 1);
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 user');
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C436767 Users | Verify pagination with no more than 100 records - Query tab (firebird)',
      { tags: ['extendedPath', 'firebird', 'C436767'] },
      () => {
        // Step 1-3: Verify that Paginator is displayed at the bottom of "Preview of record matched"
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);

        // Step 4: Click "Actions" menu => Select "Start bulk edit", select option and action, confirm changes
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.selectOption('Patron group');
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();

        // Step 5-7: Verify that Paginator is displayed at the bottom of "Preview of records to be changed"
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 8: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyBulkEditQueryPaneExists();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        // Step 9-11: Verify that Paginator is displayed at the bottom of "Preview of record changed"
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
      },
    );
  });
});
