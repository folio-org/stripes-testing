import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
  stringStoresUuidButMillionOperators,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const firstItem = {
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
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        firstItem.instanceId = InventoryInstances.createInstanceViaApi(
          firstItem.instanceName,
          firstItem.itemBarcode,
        );
        secondItem.instanceId = InventoryInstances.createInstanceViaApi(
          secondItem.instanceName,
          secondItem.itemBarcode,
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(firstItem.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.itemBarcode);
    });

    it(
      'C436764 Query builder - Search items records associated with a given instance ("String - stores UUID but match could return millions of records" property type) (firebird)',
      { tags: ['smoke', 'firebird', 'C436764'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.instanceId);
        QueryModal.verifySelectedField(itemFieldValues.instanceId);
        QueryModal.verifyQueryAreaContent('(instances.id  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifyQueryAreaContent('(instances.id in ())');
        QueryModal.verifyValueColumn();
        QueryModal.fillInValueTextfield(`${firstItem.instanceId},${secondItem.instanceId}`);
        QueryModal.verifyQueryAreaContent(
          `(instances.id in (${firstItem.instanceId}, ${secondItem.instanceId}))`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      },
    );
  });
});
