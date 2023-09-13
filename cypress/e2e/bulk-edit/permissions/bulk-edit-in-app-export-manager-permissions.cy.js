import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodesFileName${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
        permissions.inventoryAll.gui,
        permissions.exportManagerAll.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
          );
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
        })
        .then(() => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Item barcode');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
        });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C353971 Verify that user can view data in Export Manager based on permissions (In-app approach) (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        cy.visit(TopMenu.exportManagerPath);
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.selectJob(user.username);
        ExportManagerSearchPane.clickJobIdInThirdPane();
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          [item.itemBarcode],
          'barcode',
          true,
        );
      },
    );
  });
});
