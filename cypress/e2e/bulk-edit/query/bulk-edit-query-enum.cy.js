import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  enumOperators,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
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

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C436765 Query builder - Search items with a given status ("Enum" property type) (firebird)',
      { tags: ['smoke', 'firebird', 'C436765'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.itemStatus);
        QueryModal.verifySelectedField(itemFieldValues.itemStatus);
        QueryModal.verifyQueryAreaContent('(items.status_name  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.verifyOperatorsList(enumOperators);
        QueryModal.selectOperator('not in');
        QueryModal.verifyQueryAreaContent('(items.status_name not in ())');
        QueryModal.verifyValueColumn();
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.ON_ORDER);
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.AGED_TO_LOST);
        QueryModal.verifyQueryAreaContent(
          `(items.status_name not in [${ITEM_STATUS_NAMES.ON_ORDER}, ${ITEM_STATUS_NAMES.AGED_TO_LOST}])`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.removeValueFromMultiselect(ITEM_STATUS_NAMES.ON_ORDER);
        QueryModal.removeValueFromMultiselect(ITEM_STATUS_NAMES.AGED_TO_LOST);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.AVAILABLE);
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.MISSING);
        QueryModal.verifyQueryAreaContent(
          `(items.status_name not in [${ITEM_STATUS_NAMES.AVAILABLE}, ${ITEM_STATUS_NAMES.MISSING}])`,
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
