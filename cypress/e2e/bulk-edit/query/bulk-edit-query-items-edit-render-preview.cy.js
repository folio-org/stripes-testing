import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { LOCATION_NAMES, LOCATION_IDS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
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

        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            res.temporaryLocation = { id: LOCATION_IDS.ONLINE };
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
      { tags: ['criticalPath', 'firebird', 'C440063'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.temporaryLocation);
        QueryModal.verifySelectedField(itemFieldValues.temporaryLocation);
        QueryModal.verifyQueryAreaContent('(temporary_location.name  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(temporary_location.name == )');
        QueryModal.verifyValueColumn();
        QueryModal.chooseValueSelect(LOCATION_NAMES.ONLINE_UI);
        QueryModal.verifyQueryAreaContent(
          `(temporary_location.name == ${LOCATION_NAMES.ONLINE_UI})`,
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
        BulkEditSearchPane.verifyResultColumnTitles(columnNameNote);
        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        const columnName = 'Item HRID';
        BulkEditSearchPane.searchColumnName(columnName);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnName);
        BulkEditSearchPane.changeShowColumnCheckbox(columnName);
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnName);
      },
    );
  });
});
