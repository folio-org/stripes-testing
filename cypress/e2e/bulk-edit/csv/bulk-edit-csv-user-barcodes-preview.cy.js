import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

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
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        FileManager.createFile(
          `cypress/fixtures/${invalidUserBarcodesFileName}`,
          getRandomPostfix(),
        );
      });
    });

    beforeEach('reload bulk-edit page', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
    });

    it(
      'C347872 Populating preview of matched records (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyUserBarcodesResultAccordion();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);

        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
        BulkEditSearchPane.verifyUsersActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckbox('Last name');
        BulkEditSearchPane.verifyResultColumTitlesDoNotInclude('Last name');

        BulkEditSearchPane.changeShowColumnCheckbox('Email');
        BulkEditSearchPane.verifyResultColumTitles('Email');
      },
    );

    it(
      'C360556 Populating preview of matched records in case no matches (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
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
