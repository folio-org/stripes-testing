import { APPLICATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      "C365590 Verify that User's Email can be edited partially (firebird)",
      { tags: ['extendedPath', 'firebird', 'C365590'] },
      () => {
        // Step 1: Select "Users" radio button under "Record types" accordion
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

        // Step 2: Upload a .csv file with users barcodes by dragging it on the file "drag and drop" area
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);

        // Step 3: Click "Actions" menu and check checkbox (if not yet checked): Email
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          user.barcode,
          'Email',
          user.personal.email,
        );

        // Step 4: Click "Actions" menu => Select the "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditForm();

        // Step 5: Click "Select Option" dropdown => Select "Email" option
        BulkEditActions.selectOption('Email');
        BulkEditActions.verifyOptionSelected('Email');
        BulkEditActions.verifyActionSelected('Find');
        BulkEditActions.replaceWithIsDisabled();

        // Step 6-7: Enter existed email domain in field for email next to "Find" option in format ".com"
        const originalDomain = '.org';
        const newDomain = '.com';

        BulkEditActions.replaceEmail(originalDomain, newDomain);

        // Step 8: Click "Confirm changes"
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);

        const newEmailFirstChanges = user.personal.email.replace(originalDomain, newDomain);

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          user.barcode,
          'Email',
          newEmailFirstChanges,
        );

        // Step 9: Click on the "X" at the "Are you sure?" form
        BulkEditActions.closeAreYouSureForm();

        // Step 10: Enter existed email domain in format "example.com" and make changes to both parts
        const fullDomain = 'folio.org';
        const modifiedDomain = 'folio2.org2';

        BulkEditActions.enterOldEmail(fullDomain);
        BulkEditActions.enterNewEmail(modifiedDomain);

        // Step 11: Click "Confirm changes"
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);

        const newEmailSecondChanges = user.personal.email.replace(fullDomain, modifiedDomain);

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          user.barcode,
          'Email',
          newEmailSecondChanges,
        );

        // Step 12: Click on the "X" at the "Are you sure?" form
        BulkEditActions.closeAreYouSureForm();

        // Step 13: Enter existed FULL email in format "test@example.com" and make changes to any part
        const newEmailThirdChange = user.personal.email.replace('fo', 'new');

        BulkEditActions.enterOldEmail(user.personal.email);
        BulkEditActions.enterNewEmail(newEmailThirdChange);

        // Step 14: Click "Confirm changes"
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          user.barcode,
          'Email',
          newEmailThirdChange,
        );

        // Step 15: Click the "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyChangedResults(newEmailThirdChange);

        // Step 16: Go to the "Users" app => Select "Barcode" option => Search for the user
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.barcode);

        // Step 17: Click on row with matched record => Click on the "Contact information" accordion
        UsersSearchPane.openUser(user.barcode);
        UsersCard.openContactInfo();
        UsersCard.verifyEmail(newEmailThirdChange);
      },
    );
  });
});
