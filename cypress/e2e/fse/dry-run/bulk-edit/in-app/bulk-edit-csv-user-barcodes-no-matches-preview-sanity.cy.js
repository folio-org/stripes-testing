import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    const { user, memberTenant } = parseSanityParameters();
    let invalidUserBarcode;
    let invalidUserBarcodesFileName;

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        invalidUserBarcode = getRandomPostfix();
        invalidUserBarcodesFileName = `invalidUserBarcodes_${getRandomPostfix()}.csv`;

        FileManager.createFile(
          `cypress/fixtures/${invalidUserBarcodesFileName}`,
          invalidUserBarcode,
        );
      });
    });

    after('Cleanup', () => {
      FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
    });

    it(
      'C360556 Populating preview of matched records in case no matches (firebird)',
      { tags: ['dryRun', 'firebird', 'C360556'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        cy.allure().logCommandSteps(true);

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.matchedAccordionIsAbsent();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserBarcode);
        BulkEditSearchPane.verifySpinnerAbsent();

        BulkEditActions.openActions();
        BulkEditActions.verifyUsersActionDropdownItemsInCaseOfError();
        BulkEditSearchPane.verifySearchColumnNameTextFieldAbsent();
        BulkEditActions.downloadErrorsExists();
      },
    );
  });
});
