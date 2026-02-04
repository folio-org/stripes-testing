import uuid from 'uuid';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
const invalidUUID = uuid();

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    it(
      'C446066 Verify the "Run query" button, when the query returns 0 - items (firebird)',
      { tags: ['dryRun', 'firebird', 'C446066'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.holdingsId);
        QueryModal.verifySelectedField(itemFieldValues.holdingsId);
        QueryModal.verifyQueryAreaContent('(holdings.id  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(holdings.id == )');
        QueryModal.verifyValueColumn();
        QueryModal.fillInValueTextfield(invalidUUID);
        QueryModal.verifyQueryAreaContent(`(holdings.id == ${invalidUUID})`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.exists();
        QueryModal.verifyQueryAreaContent(`(holdings.id == ${invalidUUID})`);
        QueryModal.verifyValueColumn();
        QueryModal.verifyOperatorColumn();
        QueryModal.testQueryDisabled(false);
        BulkEditSearchPane.verifyInputLabel('Query returns no records.');
        BulkEditSearchPane.verifyInputLabel('The list contains no items');
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.xButttonDisabled(false);
      },
    );
  });
});
