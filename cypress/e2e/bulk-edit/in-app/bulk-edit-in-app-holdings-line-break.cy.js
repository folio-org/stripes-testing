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
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
const items = [];
const holdingsHRIDs = [];
const holdingsNote = 'Line-1\nLine-2\nLine-3\nLine-4';
const holdingsHRIDFileName = `holdingsHRID_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingsHRIDFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingsHRIDFileName}`;
const previewFileName = `*-Updates-Preview-${holdingsHRIDFileName}`;

for (let i = 0; i < 3; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
    instanceId: '',
  });
}

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        items.forEach((item) => {
          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
            (holdings) => {
              holdingsHRIDs.push(holdings[0].hrid);
              FileManager.appendFile(
                `cypress/fixtures/${holdingsHRIDFileName}`,
                `${holdings[0].hrid}\n`,
              );
            },
          );
        });
        [items[0].instanceName, items[1].instanceName].forEach((instance) => {
          InventorySearchAndFilter.searchInstanceByTitle(instance);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.addHoldingsNotes(holdingsNote);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
        });
        cy.visit(TopMenu.bulkEditPath);
      });
    });

    after('delete test data', () => {
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C399093 Verify Previews for the number of Holdings records if the records have fields with line breaks (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(...holdingsHRIDs);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [holdingsNote]);
        BulkEditSearchPane.changeShowColumnCheckbox('Notes');
        BulkEditSearchPane.verifySpecificItemsMatched(holdingsNote);

        const location = 'Online';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location, 'holdings');

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(holdingsHRIDs.length, location);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [holdingsNote]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [holdingsNote]);

        cy.visit(TopMenu.inventoryPath);
        items.forEach((item) => {
          InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          InventoryInstance.verifyHoldingsTemporaryLocation(location);
          InventoryInstance.closeHoldingsView();
        });
      },
    );
  });
});
