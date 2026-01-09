import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;

const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe(
    'Permissions',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditView.gui,
          permissions.uiUsersView.gui,
          permissions.exportManagerAll.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
            cy.wait(5000);
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            cy.wait(10000);
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
            BulkEditSearchPane.checkUsersRadio();
            BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
            BulkEditSearchPane.uploadFile(userUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      });

      it(
        'C788696 Export manager -- Verify that user can view data in Export Manager based on permissions (Local approach) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C788696'] },
        () => {
          ExportManagerSearchPane.waitLoading();
          ExportManagerSearchPane.searchByBulkEdit();
          ExportManagerSearchPane.selectJob(user.username);
          ExportManagerSearchPane.clickJobIdInThirdPane();

          BulkEditFiles.verifyMatchedResultFileContent(
            matchedRecordsFileName,
            [user.userId],
            'userId',
            true,
          );
        },
      );
    },
  );
});
