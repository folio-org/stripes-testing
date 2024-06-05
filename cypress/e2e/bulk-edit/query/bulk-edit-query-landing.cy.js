import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  stringStoresUuidOperators,
  booleanOperators,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames, patronGroupUuids } from '../../../support/constants';

let user;
let secondUser;

describe('bulk-edit', () => {
  describe('query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C436871 Verify Bulk Edit Query tab (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        BulkEditSearchPane.isBuildQueryButtonDisabled();
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.isUsersRadioChecked();
        BulkEditSearchPane.verifyInputLabel('Click the Build query button to build the query.');
        BulkEditSearchPane.isBuildQueryButtonDisabled(false);
      },
    );

    it(
      'C436746 Verify actions in the "Build query" form (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft'] },
      () => {
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        BulkEditSearchPane.isBuildQueryButtonDisabled();
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.clickXButtton();
        QueryModal.absent();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.verifySelectedField(usersFieldValues.userActive);
        QueryModal.verifyQueryAreaContent('(user_active  )');
        QueryModal.verifyOperatorsList(booleanOperators);
        QueryModal.selectOperator('==');
        QueryModal.verifyQueryAreaContent('(user_active == )');
        QueryModal.verifyValueColumn();
        QueryModal.selectValueFromSelect('True');
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent('(user_active == "true")');
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn();
        QueryModal.verifyEmptyField(1);
        QueryModal.verifyEmptyOperator(1);
        QueryModal.verifyEmptyValue(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.selectField(usersFieldValues.patronGroup, 1);
        QueryModal.verifyQueryAreaContent('(user_active == "true") AND (user_patron_group  )');
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator('==', 1);
        QueryModal.verifyOperatorsList(stringStoresUuidOperators, 1);
        QueryModal.chooseValueSelect(patronGroupNames.STAFF, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(user_active == "true") AND (user_patron_group == "${patronGroupUuids.STAFF}")`,
        );
        QueryModal.clickGarbage(1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickCancel();
        QueryModal.absent();
      },
    );
  });
});
