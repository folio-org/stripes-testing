import Permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const invalidBarcode = getRandomPostfix();
const userBarcodesFileName = `userBarcodes-val-inval${getRandomPostfix()}.csv`;

describe('Bulk-Edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${user.barcode}\r\n${invalidBarcode}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C353529 Verify progress bar for uploading identifier files(firebird) (TaaS)',
      { tags: [TestTypes.smoke, DevTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.uploadFile(userBarcodesFileName);

        BulkEditSearchPane.checkForUploading(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
      },
    );
  });
});
