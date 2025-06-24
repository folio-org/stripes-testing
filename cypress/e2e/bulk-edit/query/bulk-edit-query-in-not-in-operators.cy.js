import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, { itemFieldValues } from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const secondItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        [item, secondItem].forEach((element) => {
          element.instanceId = InventoryInstances.createInstanceViaApi(
            element.instanceName,
            element.itemBarcode,
          );
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${element.itemBarcode}"`,
          }).then((res) => {
            element.itemId = res.id;
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.itemBarcode);
    });

    it(
      'C477624 Verify correct formatting of "in" and "not in" operators in query string when “Value“ column contains text box (firebird)',
      { tags: ['criticalPath', 'firebird', 'C477624'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.itemUuid);
        QueryModal.verifySelectedField(itemFieldValues.itemUuid);
        QueryModal.verifyQueryAreaContent('(items.id  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator('not in');
        QueryModal.fillInValueTextfield(item.itemId);
        QueryModal.fillInValueTextfield(`${item.itemId},`);
        QueryModal.fillInValueTextfield(`${item.itemId},${secondItem.itemId}`);
        QueryModal.verifyQueryAreaContent(
          `(items.id not in (${item.itemId}, ${secondItem.itemId}))`,
        );
        QueryModal.selectOperator('in');
        QueryModal.fillInValueTextfield(item.itemId);
        QueryModal.fillInValueTextfield(`${item.itemId},`);
        QueryModal.fillInValueTextfield(`${item.itemId},${secondItem.itemId}`);
        QueryModal.verifyQueryAreaContent(`(items.id in (${item.itemId}, ${secondItem.itemId}))`);
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
        BulkEditActions.openActions();
        BulkEditSearchPane.searchColumnName('suffix');
        const columnName = 'Item level call number suffix';
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnName);
        BulkEditSearchPane.verifyResultColumnTitles(columnName);
        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
      },
    );
  });
});
