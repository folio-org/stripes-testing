import permissions from '../../../support/dictionary/permissions';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
let userBarcodesFileName;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Csv approach', () => {
      beforeEach('create test data', () => {
        userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.wait(10000);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      });

      it(
        'C347872 Populating preview of matched records (firebird)',
        { tags: ['smoke', 'firebird', 'shiftLeft', 'C347872'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyUserBarcodesResultAccordion();
          BulkEditSearchPane.verifyMatchedResults(user.barcode);

          BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
          BulkEditSearchPane.verifyUsersActionShowColumns();

          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Last name');
          BulkEditSearchPane.changeShowColumnCheckbox('Last name');
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude('Last name');

          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
          BulkEditSearchPane.verifyResultColumnTitles('Email');
        },
      );
    });
  },
);
