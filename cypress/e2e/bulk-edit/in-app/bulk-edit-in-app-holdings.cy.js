import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let hrid;
const itemBarcode = getRandomPostfix();
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const validHoldingHRIDsFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: itemBarcode,
  itemBarcode2: `secondBarcode_${itemBarcode}`,
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode1,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          hrid = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
          FileManager.createFile(`cypress/fixtures/${validHoldingHRIDsFileName}`, hrid);
        });
      });
    });

    beforeEach('select holdings', () => {
      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode1);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingHRIDsFileName}`);
    });

    afterEach('open new bulk edit', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it(
      'C360089 Verify "Inventory - holdings" option on "Bulk edit" app (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        [
          {
            identifier: 'Holdings UUIDs',
            label: 'Select a file with holdings UUIDs',
            pageText: 'Drag and drop or choose file with holdings UUIDs',
          },
          {
            identifier: 'Holdings HRIDs',
            label: 'Select a file with holdings HRIDs',
            pageText: 'Drag and drop or choose file with holdings HRIDs',
          },
          {
            identifier: 'Instance HRIDs',
            label: 'Select a file with instance HRIDs',
            pageText: 'Drag and drop or choose file with instance HRIDs',
          },
          {
            identifier: 'Item barcodes',
            label: 'Select a file with item barcode',
            pageText: 'Drag and drop or choose file with item barcode',
          },
        ].forEach((checker) => {
          BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
          BulkEditSearchPane.verifyInputLabel(checker.label);
          BulkEditSearchPane.verifyInputLabel(checker.pageText);
        });
      },
    );

    it(
      'C356810 Verify uploading file with holdings UUIDs (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird], retries: 1 },
      () => {
        BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(hrid);

        const location = 'Online';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(location);
        BulkEditActions.verifySuccessBanner(1);
      },
    );

    it(
      'C360120 Verify that User can trigger bulk of holdings with file containing Holdings identifiers (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(hrid);

        const tempLocation = 'Annex';
        const permLocation = 'Main Library';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings', 0);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(permLocation, 'holdings', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.clickKeepEditingBtn();

        BulkEditActions.confirmChanges();
        BulkEditActions.clickX();

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, hrid);

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(tempLocation);
        BulkEditSearchPane.verifyChangedResults(permLocation);
        BulkEditActions.verifySuccessBanner(1);
      },
    );

    it(
      'C367975 Verify Bulk edit Holdings records with empty Electronic access Relationship type (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(hrid);

        const tempLocation = 'Main Library';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(tempLocation);
        BulkEditActions.verifySuccessBanner(1);

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', hrid);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.openHoldings(['']);
        InventoryInstance.verifyHoldingLocation(tempLocation);
      },
    );
  });
});
