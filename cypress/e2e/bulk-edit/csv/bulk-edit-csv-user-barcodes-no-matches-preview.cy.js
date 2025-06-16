import permissions from '../../../support/dictionary/permissions';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';

let user;
let invalidUserBarcode;
let invalidUserBarcodesFileName;

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
        invalidUserBarcode = getRandomPostfix();
        invalidUserBarcodesFileName = `invalidUserBarcodes_${getRandomPostfix()}.csv`;

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
            invalidUserBarcode,
          );
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
      });

      it(
        'C360556 Populating preview of matched records in case no matches (firebird)',
        { tags: ['smoke', 'firebird', 'shiftLeft', 'C360556'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
          BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.matchedAccordionIsAbsent();
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyNonMatchedResults(invalidUserBarcode);

          BulkEditActions.openActions();
          BulkEditActions.verifyUsersActionDropdownItemsInCaseOfError();
          BulkEditSearchPane.verifySearchColumnNameTextFieldAbsent();
          BulkEditActions.downloadErrorsExists();
        },
      );
    });
  },
);
