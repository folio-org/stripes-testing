import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
          (holdings) => {
            item.holdingsHRID = holdings[0].hrid;
            FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, holdings[0].hrid);
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375096 Verify default state of Bulk edit landing page (In app Users + In app inventory) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C375096'] },
      () => {
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneElements();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneElements();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.isHoldingsRadioChecked(true);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled(false);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneElements();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.isHoldingsRadioChecked(true);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled(false);
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

        cy.reload();
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneElements();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneElements();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();
      },
    );
  });
});
