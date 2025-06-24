import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const invalidHoldingUUID = `invalidHoldingUUID-${uuid()}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const invalidHoldingUUIDsFileName = `InvalidHoldingUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
          FileManager.createFile(
            `cypress/fixtures/${invalidHoldingUUIDsFileName}`,
            invalidHoldingUUID,
          );
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidHoldingUUIDsFileName}`);
    });

    it(
      'C423558 Verify "Search column name" search box for Holdings records. (firebird)',
      { tags: ['smoke', 'firebird', 'C423558'] },
      () => {
        cy.viewport(1920, 1080);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyHoldingActionShowColumns();
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        BulkEditSearchPane.searchColumnName('note');
        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        const columnName = 'Holdings UUID';
        BulkEditSearchPane.searchColumnName(columnName);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnName);
        BulkEditSearchPane.changeShowColumnCheckbox(columnName);
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnName);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('0 holdings');
        BulkEditSearchPane.verifyNonMatchedResults(invalidHoldingUUID);
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditSearchPane.searchColumnNameTextfieldAbsent();
      },
    );
  });
});
