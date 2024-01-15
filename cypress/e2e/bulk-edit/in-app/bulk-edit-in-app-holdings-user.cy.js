import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let holdingHRID;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          holdingHRID = holdings[0].hrid;
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            // Popular Reading Collection
            permanentLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
          });
          FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });

      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
    });

    it(
      'C360114 Verify that User can upload file with Holdings UUIDs (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        [
          'Holdings HRID',
          'Holdings type',
          'Permanent location',
          'Temporary location',
          'Call number prefix',
          'Call number',
          'Call number suffix',
        ].forEach((title) => {
          BulkEditSearchPane.verifyResultColumTitles(title);
        });
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyHoldingActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckbox('Permanent location');
        BulkEditSearchPane.verifyResultColumTitlesDoNotInclude('Permanent location');

        BulkEditSearchPane.changeShowColumnCheckbox('Call number type');
        BulkEditSearchPane.verifyResultColumTitles('Call number type');
      },
    );

    it(
      'C367984 Verify that visual clue on the "Are you sure?" form does not provide 0 records (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);

        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingHRID);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        const permLocation = 'Main Library';
        BulkEditActions.replacePermanentLocation(permLocation, 'holdings', 0);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, holdingHRID);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Permanent location');
        BulkEditSearchPane.verifyChangedResults(permLocation);
        BulkEditActions.verifySuccessBanner(1);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', holdingHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        InventoryInstance.verifyHoldingsPermanentLocation(permLocation);
      },
    );
  });
});
