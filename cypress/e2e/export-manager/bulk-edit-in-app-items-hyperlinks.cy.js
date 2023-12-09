import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../support/fragments/users/users';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import FileManager from '../../support/utils/fileManager';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ExportFile from '../../support/fragments/data-export/exportFile';

let user;
let userWithPermissions;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('export-manager', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
      permissions.exportManagerView.gui,
    ])
      .then((userProperties) => {
        userWithPermissions = userProperties;
      });
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.exportManagerView.gui,
    ])
      .then((userProperties) => {
        user = userProperties;
        cy.login(userWithPermissions.username, userWithPermissions.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
      });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userWithPermissions.userId);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
  });

  it(
    'C365105 Verify hyperlink on the "JobID" column -- Items in app approach (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');
      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      cy.login(user.username, user.password)
      cy.visit(TopMenu.exportManagerPath);
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.searchByBulkEdit();
      ExportManagerSearchPane.selectJob(userWithPermissions.username);
      cy.intercept('GET', '/data-export-spring/jobs/*').as('getId');
      cy.wait('@getId', { timeout: 10000 }).then((res) => {
        const jobID = res.response.body.name;
        ExportManagerSearchPane.verifyJobDataInResults(['Successful', 'Bulk edit identifiers']);
        ExportManagerSearchPane.clickJobIdInThirdPane();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemBarcode]);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
        ExportDetails.closeJobDetails();
        ExportManagerSearchPane.clickJobId(jobID);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemBarcode]);
      });
    },
  );
});
