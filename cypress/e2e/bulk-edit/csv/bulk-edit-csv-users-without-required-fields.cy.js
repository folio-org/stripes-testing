import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let testUser;
const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName, true);
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create test user without required field (preferredContactTypeId)
        const testUserModel = {
          username: `at_C359008_username_${getRandomPostfix()}`,
          barcode: `AT_${getRandomPostfix()}`,
          active: true,
          type: 'patron',
          personal: {
            lastName: `AT_LastName_${getRandomPostfix()}`,
            firstName: `AT_FirstName_${getRandomPostfix()}`,
            email: `AT_Email_${getRandomPostfix()}@folio.org`,
          },
        };

        cy.createTempUserParameterized(testUserModel, [], { userType: 'patron' }).then(
          (userProps) => {
            testUser = userProps;

            FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, testUser.userId);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(testUser.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C359008 Verify that no errors appeared when uploading file with Users without required fields in Bulk Edit (firebird)',
      { tags: ['extendedPath', 'firebird', 'C359008'] },
      () => {
        // Step 1: Select "Users" option from "Record types" accordion => Select "User UUIDs" from "Record Identifier" dropdown
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');

        // Step 2: Upload a .csv file with Users UUIDs by dragging it on the file "drag and drop" area
        BulkEditSearchPane.uploadFile(userUUIDsFileName);

        // Step 3: Check the running of progressbar
        BulkEditSearchPane.checkForUploading(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 4: Check the result when upload is completed
        BulkEditSearchPane.verifyMatchedResults(testUser.username);

        // Step 5: Click "Actions" button => Select "Download matched records (CSV)" option
        BulkEditActions.downloadMatchedResults();

        // Step 6: Modify records in the downloaded file => Save changes and close => Click "Actions" buttons
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          testUser.firstName,
          newFirstName,
        );

        // Step 7: Click the "Start bulk edit (Local)" button
        BulkEditActions.openStartBulkEditLocalForm();
        BulkEditActions.verifyLabel('Bulk edit');
        BulkEditActions.verifyCancelButtonDisabled(false);
        BulkEditActions.verifyNextButtonInCsvModalDisabled();

        // Step 8: Upload .csv file with edited records from local machine by choosing this file via file explorer
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 9: Click "Next" button => Click "Commit changes" button
        BulkEditActions.clickNext();
        BulkEditSearchPane.verifyCsvUploadModal(editedFileName);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(newFirstName);
        BulkEditSearchPane.errorsAccordionIsAbsent();
        BulkEditActions.openActions();
      },
    );
  });
});
