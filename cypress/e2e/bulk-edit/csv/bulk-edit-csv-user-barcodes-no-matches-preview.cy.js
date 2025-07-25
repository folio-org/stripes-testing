import permissions from '../../../support/dictionary/permissions';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const invalidUserBarcodesFileName = `invalidUserBarcodes_${getRandomPostfix()}.csv`;

describe(
  'bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('csv approach', () => {
      beforeEach('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(
            `cypress/fixtures/${invalidUserBarcodesFileName}`,
            getRandomPostfix(),
          );
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
      });

      it(
        'C692090 Populating preview of matched records in case no matches (firebird)',
        { tags: ['smoke', 'firebird', 'shiftLeft', 'C692090'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
          BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.matchedAccordionIsAbsent();
          BulkEditSearchPane.verifyErrorLabel(invalidUserBarcodesFileName, 0, 1);

          BulkEditActions.openActions();
          BulkEditActions.verifyUsersActionDropdownItemsInCaseOfError();
        },
      );
    });
  },
);
