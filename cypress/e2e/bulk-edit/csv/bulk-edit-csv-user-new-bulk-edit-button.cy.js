import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const uuidMatchedRecordsFileName = `*-Matched-Records-${userUUIDsFileName}`;
const uuidEditedFileName = `edited-userUUIDs-${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const barcodeMatchedRecordsFileName = `*-Matched-Records-${userBarcodesFileName}`;
const barcodeEditedFileName = `edited-userBarcodes-${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        })
        .then(() => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          const newFirstName = `testFirstName_${getRandomPostfix()}`;
          BulkEditActions.downloadMatchedResults();
          BulkEditActions.prepareValidBulkEditFile(
            uuidMatchedRecordsFileName,
            uuidEditedFileName,
            'testPermFirst',
            newFirstName,
          );
          BulkEditActions.openStartBulkEditForm();
          BulkEditSearchPane.uploadFile(uuidEditedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(newFirstName);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${uuidEditedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${barcodeEditedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        uuidMatchedRecordsFileName,
        barcodeMatchedRecordsFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353551 Verify absence of "New bulk edit" button (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditActions.verifyNoNewBulkEditButton();
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyDefaultFilterState();
      },
    );

    it(
      'C353650 Verify new bulk edit with changed identifiers (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditActions.verifyNoNewBulkEditButton();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyMatchedResultFileContent(
          uuidMatchedRecordsFileName,
          [user.userId],
          'userId',
          true,
        );

        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.usersRadioIsDisabled(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditActions.verifyNoNewBulkEditButton();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyMatchedResultFileContent(
          barcodeMatchedRecordsFileName,
          [user.barcode],
          'userBarcode',
          true,
        );
        const newUsername = `testUserName_${getRandomPostfix()}`;
        BulkEditActions.prepareValidBulkEditFile(
          barcodeMatchedRecordsFileName,
          barcodeEditedFileName,
          user.username,
          newUsername,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(barcodeEditedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangedResults(newUsername);
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.usersRadioIsDisabled(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      },
    );
  });
});
