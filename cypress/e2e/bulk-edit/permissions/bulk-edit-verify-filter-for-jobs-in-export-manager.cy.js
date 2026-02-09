import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const jobTypeAccordionOptions = [
  'Authority control',
  'Bursar',
  'Circulation log',
  'eHoldings',
  'Bulk edit',
  'Edifact orders export',
];

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiUsersView.gui,
        Permissions.exportManagerView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        })
        .then(() => {
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C788686 Verify filter for bulk edit jobs in Export Manager (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C788686'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
        ExportManagerSearchPane.waitLoading();

        ExportManagerSearchPane.checkFilterOptions(jobTypeAccordionOptions);
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.verifyResult('Bulk edit identifiers');

        ExportManagerSearchPane.searchBySuccessful();
        ExportManagerSearchPane.verifyJobDataInResults(['Successful', 'Bulk edit identifiers']);
        ExportManagerSearchPane.resetAll();
        ExportManagerSearchPane.waitLoading();
      },
    );
  });
});
