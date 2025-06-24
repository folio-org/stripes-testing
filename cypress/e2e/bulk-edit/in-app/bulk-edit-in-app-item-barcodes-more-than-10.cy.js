import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const items = [];
for (let i = 0; i < 6; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: `barcode${getRandomPostfix()}`,
  });
}
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const errorsFromMatchingFileName =
  BulkEditFiles.getErrorsFromMatchingFileName(itemBarcodesFileName);

// Test cannot be automated after test case update
describe.skip('bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        items.forEach((item) => {
          item.secondItemBarcode = `secondBarcode_${item.itemBarcode}`;
          item.invalidBarcode = `1-${getRandomPostfix()}`;
          item.secondInvalidBarcode = `2-${getRandomPostfix()}`;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          FileManager.appendFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${item.itemBarcode}\n${item.secondItemBarcode}\n${item.invalidBarcode}\n${item.secondInvalidBarcode}\n`,
          );
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);
    });

    it(
      'C358936 Verify the preview of matched records uploading more than 10 Identifiers (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C358936'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        cy.intercept('preview?limit=10&step=UPLOAD').as('fileUpload');
        cy.intercept('errors?limit=10').as('errors');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        cy.wait('@fileUpload', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(10);
        });
        cy.wait('@errors', getLongDelay()).then((res) => {
          expect(res.response.body.errors).to.have.length(10);
        });
        BulkEditActions.downloadMatchedResults();
        items.forEach((item) => {
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemBarcode]);
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.secondItemBarcode]);
        });
        BulkEditActions.downloadErrors();
        items.forEach((item) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [item.invalidBarcode]);
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [item.secondInvalidBarcode]);
        });
      },
    );
  });
});
