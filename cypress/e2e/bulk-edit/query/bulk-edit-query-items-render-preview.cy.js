import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, { itemFieldValues } from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { LOCATION_NAMES, LOCATION_IDS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};

describe('Bulk Edit - Query', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.bulkEditEdit.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
      permissions.bulkEditQueryView.gui,
    ]).then((userProperties) => {
      user = userProperties;

      InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
        (res) => {
          res.temporaryLocation = { id: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5' };
          cy.updateItemViaApi(res);
        },
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
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
  });

  it(
    'C440063 Render preview after query executed (Items - Edit) (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.clickBuildQueryButton();
      QueryModal.verify();
      QueryModal.verifyFieldsSortedAlphabetically();
      QueryModal.selectField(itemFieldValues.temporaryLocation);
      QueryModal.verifySelectedField(itemFieldValues.temporaryLocation);
      QueryModal.verifyQueryAreaContent('(item_temporary_location_name  )');
      QueryModal.verifyOperatorColumn();
      QueryModal.selectOperator('==');
      QueryModal.verifyQueryAreaContent('(item_temporary_location_name == )');
      QueryModal.verifyValueColumn();
      QueryModal.chooseValueSelect(LOCATION_NAMES.ONLINE_UI);
      QueryModal.verifyQueryAreaContent(
        `(item_temporary_location_name == "${LOCATION_IDS.ONLINE}")`,
      );
      QueryModal.testQueryDisabled(false);
      QueryModal.runQueryDisabled();
      QueryModal.clickTestQuery();
      QueryModal.verifyPreviewOfRecordsMatched();
      QueryModal.clickRunQuery();
      QueryModal.verifyClosed();
      BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      BulkEditSearchPane.isBuildQueryButtonDisabled();
      BulkEditSearchPane.isHoldingsRadioChecked(false);
      BulkEditSearchPane.isInstancesRadioChecked(false);
      BulkEditSearchPane.isItemsRadioChecked(true);
      BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
      BulkEditSearchPane.verifyActionsDropdownScrollable();
      BulkEditSearchPane.searchColumnName('note');
      const columnNameNote = 'Action note';
      BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnNameNote);
      BulkEditSearchPane.verifyResultColumTitles(columnNameNote);
      BulkEditSearchPane.searchColumnName('fewoh', false);
      BulkEditSearchPane.clearSearchColumnNameTextfield();
      BulkEditSearchPane.verifyActionsDropdownScrollable();
      const columnName = 'Item HRID';
      BulkEditSearchPane.searchColumnName(columnName);
      BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnName);
      BulkEditSearchPane.changeShowColumnCheckbox(columnName);
      BulkEditSearchPane.verifyResultColumTitlesDoNotInclude(columnName);
    },
  );
});
