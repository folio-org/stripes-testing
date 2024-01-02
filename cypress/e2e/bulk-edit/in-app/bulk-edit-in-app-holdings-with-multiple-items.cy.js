import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
  publisher: 'MIT',
  dateOfPublication: '06.06.2006',
};
const instanceDetailsToCheck = `${item.instanceName}. ${item.publisher}, ${item.dateOfPublication}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
        cy.getInstanceById(item.instanceId).then((body) => {
          body.publication = [
            {
              publisher: item.publisher,
              place: item.publisher,
              role: item.publisher,
              dateOfPublication: item.dateOfPublication,
            },
          ];
          cy.updateInstance(body);
        });
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            // Popular Reading Collection location
            permanentLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
            temporaryLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C411642 Verify update Holdings with multiple Items associated (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckbox(
          'Instance (Title, Publisher, Publication date)',
        );
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Instance (Title, Publisher, Publication date)',
          instanceDetailsToCheck,
        );
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [instanceDetailsToCheck]);

        const tempLocation = 'Main Library';
        const permLocation = 'Annex';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(permLocation, 'holdings', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [instanceDetailsToCheck]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [instanceDetailsToCheck]);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          item.instanceName,
        );
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        InventoryInstance.verifyHoldingsPermanentLocation(permLocation);
        InventoryInstance.verifyHoldingsTemporaryLocation(tempLocation);
      },
    );
  });
});
