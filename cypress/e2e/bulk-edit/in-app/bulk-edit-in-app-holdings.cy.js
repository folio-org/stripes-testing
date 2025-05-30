import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  holdingsIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

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

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

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
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode1);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingHRIDsFileName}`);
    });

    afterEach('open new bulk edit', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
    });

    it(
      'C360089 Verify "Inventory - holdings" option on "Bulk edit" app (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C360089'] },
      () => {
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Holdings');
        holdingsIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', identifier);
        });
      },
    );

    it(
      'C356810 Verify uploading file with holdings UUIDs (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C356810'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
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
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C360120'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
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
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C367975'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(hrid);

        const tempLocation = 'SECOND FLOOR';

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
