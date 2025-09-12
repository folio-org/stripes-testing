import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getInstanceById(item.instanceId).then((body) => {
          body.staffSuppress = true;
          cy.updateInstance(body);
        });
        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, item.instanceId);
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
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C431144 Verify updated properties columns appear on "Are you sure?" form and on Confirmation screen - Instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C431144'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.instanceId]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Staff suppress', 'Instance UUID');
        BulkEditSearchPane.verifyMatchedResults(item.instanceId);
        BulkEditSearchPane.changeShowColumnCheckbox('Staff suppress');
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude('Staff suppress');
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.selectOption('Staff suppress');
        BulkEditSearchPane.verifyInputLabel('Staff suppress');
        BulkEditActions.selectSecondAction('Set false');

        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`${item.instanceId},false,false,`]);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Staff suppress', 'false');

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Staff suppress', 'false');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [`${item.instanceId},false,false,`]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyNoStaffSuppress();
      },
    );
  });
});
