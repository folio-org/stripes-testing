import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    beforeEach('go to bulk-edit page', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
    });

    it(
      'C359248 Verify "Email" option in bulk edit (firebird)',
      { tags: ['smoke', 'firebird', 'C359248'] },
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
      { tags: ['criticalPath', 'firebird', 'C359592'] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
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
      { tags: ['criticalPath', 'firebird', 'C359606'] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        const newEmailDomain = 'google.com';
        BulkEditActions.replaceEmail('folio123.org', newEmailDomain);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          user.barcode,
          'No change in value required',
          'Warning',
        );
      },
    );
  });
});
