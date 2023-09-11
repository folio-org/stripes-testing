import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const userBarcodesFileNameWithDuplicates = `userBarcodesDuplicates_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'faculty',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileNameWithDuplicates}`,
          `${user.barcode}\r\n${user.barcode}\r\n${getRandomPostfix()}`,
        );
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileNameWithDuplicates}`);
      FileManager.deleteFileFromDownloadsByMask(`*Errors-${userBarcodesFileNameWithDuplicates}`);
      Users.deleteViaApi(user.userId);
    });

    beforeEach('go to bulk-edit page', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
    });

    it(
      'C359586 Negative --Verify populating "Errors" accordion (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Username');
        BulkEditSearchPane.verifyResultColumTitlesDoNotInclude('Username');
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(userBarcodesFileName, 0, 1);
      },
    );

    it(
      'C347883 Error messages in submitted identifiers (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileNameWithDuplicates);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
      },
    );
  });
});
