import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';

let user;
const invalidUUID = uuid();

describe('bulk-edit', () => {
  describe('query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
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

    it(
      'C446067 Verify the "Run query" button, when the query returns 0 - holdings (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.selectField(holdingsFieldValues.instanceUuid);
        QueryModal.verifySelectedField(holdingsFieldValues.instanceUuid);
        QueryModal.verifyQueryAreaContent('(instance_id  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(instance_id == )');
        QueryModal.verifyValueColumn();
        QueryModal.fillInValueTextfield(invalidUUID);
        QueryModal.verifyQueryAreaContent(`(instance_id == "${invalidUUID}")`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.exists();
        QueryModal.verifyQueryAreaContent(`(instance_id == "${invalidUUID}")`);
        QueryModal.verifyValueColumn();
        QueryModal.verifyOperatorColumn();
        QueryModal.testQueryDisabled(false);
        BulkEditSearchPane.verifyInputLabel('Query would return 0 records.');
        BulkEditSearchPane.verifyInputLabel('The list contains no items');
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.xButttonDisabled(false);
      },
    );
  });
});
