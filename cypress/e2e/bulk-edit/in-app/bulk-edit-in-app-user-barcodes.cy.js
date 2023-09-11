import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../support/fragments/users/usersCard';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        },
      );
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    beforeEach('go to bulk-edit page', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
    });

    it(
      'C359248 Verify "Email" option in bulk edit (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyBulkEditForm();
      },
    );

    it(
      'C359592 Verify updating Email in Bulk edit (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Email');
        BulkEditActions.openInAppStartBulkEditFrom();
        const newEmailDomain = 'google.com';
        BulkEditActions.replaceEmail('folio.org', newEmailDomain);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangedResults(`test@${newEmailDomain}`);
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(user.username);
        UsersSearchPane.openUser(user.username);
        UsersCard.openContactInfo();
        UsersCard.verifyEmail(`test@${newEmailDomain}`);
      },
    );

    it(
      'C359606 Negative -- Verify bulk edit Users emails (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        const newEmailDomain = 'google.com';
        BulkEditActions.replaceEmail('folio123.org', newEmailDomain);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(userBarcodesFileName, 0, 1);
      },
    );
  });
});
