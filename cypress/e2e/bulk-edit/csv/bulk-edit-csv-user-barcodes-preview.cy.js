import permissions from '../../../support/dictionary/permissions';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const invalidUserBarcodesFileName = `invalidUserBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        FileManager.createFile(
          `cypress/fixtures/${invalidUserBarcodesFileName}`,
          getRandomPostfix(),
        );
      });
    });

    beforeEach('reload bulk-edit page', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
    });

    it(
      'C347872 Populating preview of matched records (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C347872'] },
      () => {
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

    it(
      'C360556 Populating preview of matched records in case no matches (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C360556'] },
      () => {
        BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.matchedAccordionIsAbsent();
        BulkEditSearchPane.verifyErrorLabel(invalidUserBarcodesFileName, 0, 1);

        BulkEditActions.openActions();
        BulkEditActions.verifyUsersActionDropdownItemsInCaseOfError();
      },
    );
  });
});
