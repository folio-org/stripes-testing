import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const items = [];

// prepare names for 5 instances with 2 items = 10 items
for (let i = 0; i < 5; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  });
}

const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        let fileContent = '';
        items.forEach((item) => {
          item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
          fileContent += `${item.itemBarcode}\r\n${item.secondBarcode}\r\n`;
          InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
            null,
            '1',
            '2',
            item.accessionNumber,
          );
        });

        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    beforeEach('select item tab', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
    });

    after('delete test data', () => {
      cy.getAdminToken();
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C358939 Verify that 10 records returned in preview of matched records after editing (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C358939'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation('Annex');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.verifySuccessBanner(10);
        BulkEditSearchPane.verifyLocationChanges(10, 'Annex');
      },
    );

    it(
      'C359210 Verify the in-app bulk edit permanent loan type (firebird)',
      { tags: ['smoke', 'firebird', 'C359210'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.fillPermanentLoanType('Selected');
        BulkEditActions.verifyModifyLandingPageAfterModifying();
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        items.forEach((item) => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.closeDetailView();
          InventoryInstance.openHoldings(['']);
          InventoryInstance.verifyLoan('Selected');
          InventorySearchAndFilter.resetAll();
        });
      },
    );

    it(
      'C359225 Verify the in-app bulk edit temporary loan type (firebird)',
      { tags: ['smoke', 'firebird', 'C359225'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillTemporaryLoanType('Selected');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        items.forEach((item) => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.closeDetailView();
          InventoryInstance.openHoldings(['']);
          InventoryInstance.verifyLoan('Selected');
          InventorySearchAndFilter.resetAll();
        });
      },
    );

    it(
      'C359226 Verify user can clear temporary loan type value (firebird)',
      { tags: ['smoke', 'firebird', 'C359226'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.clearTemporaryLoanType();
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        items.forEach((item) => {
          InventorySearchAndFilter.searchByParameter(
            'Keyword (title, contributor, identifier, HRID, UUID)',
            item.instanceName,
          );
          InventorySearchAndFilter.selectSearchResultItem();
          InventoryInstance.openHoldings(['']);
          InventoryInstance.verifyLoanInItemPage(item.itemBarcode, '-');
          InventorySearchAndFilter.resetAll();
        });
      },
    );

    it(
      'C360530 Verify that User cannot clear permanent loan type (firebird)',
      { tags: ['smoke', 'firebird', 'C360530'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPermanentLoanType();
        BulkEditActions.replaceWithIsDisabled();
      },
    );

    it(
      'C359208 Verify Loan types options in Bulk Edit (firebird)',
      { tags: ['criticalPath', 'firebird', 'C359208'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.clickOptionsSelection();

        const possibleActions = [
          'Temporary item location',
          'Permanent item location',
          'Item status',
          'Temporary loan type',
          'Permanent loan type',
        ];
        BulkEditActions.verifyPossibleActions(possibleActions);
      },
    );
  });
});
