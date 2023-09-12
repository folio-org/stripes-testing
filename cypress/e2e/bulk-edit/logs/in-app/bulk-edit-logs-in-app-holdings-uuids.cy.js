import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

let user;
let uuid;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameValid = `Matched-Records-${validHoldingUUIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${validHoldingUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validHoldingUUIDsFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      const instanceId = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      cy.getHoldings({
        limit: 1,
        query: `"instanceId"="${instanceId}"`,
      }).then((holdings) => {
        uuid = holdings[0].id;
        FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, uuid);
      });
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      validHoldingUUIDsFileName,
      `*${matchedRecordsFileNameValid}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
    );
  });

  it(
    'C375289 Verify generated Logs files for Holdings In app -- only valid Holdings UUIDs (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.openInAppStartBulkEditFrom();

      const tempLocation = 'Annex';
      const permLocation = 'Main Library';

      BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings', 0);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replacePermanentLocation(permLocation, 'holdings', 1);

      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);
      BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(validHoldingUUIDsFileName, [uuid]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileNameValid}`,
        [uuid],
        'firstElement',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [tempLocation],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [permLocation],
        'permanentLocation',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [tempLocation],
        'temporaryLocation',
        true,
      );
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [permLocation],
        'permanentLocation',
        true,
      );

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.searchByParameter('Holdings UUID', uuid);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.selectViewHoldings();
      InventoryInstance.verifyHoldingsPermanentLocation(permLocation);
      InventoryInstance.verifyHoldingsTemporaryLocation(tempLocation);
    },
  );
});
