import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DateTools from '../../../support/utils/dateTools';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let testUser;
let patronGroup;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const newExpirationDate = DateTools.addDays(30);
const formattedExpirationDate = DateTools.getFormattedDateWithSlashes({ date: newExpirationDate });
const patronGroupName = `AT_368047_li|br;TEST)n_${getRandomPostfix()}`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(testUser.userId);
      cy.deleteUserGroupApi(patronGroup);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C368047 Verify that absence of not editable fields values should not prevent bulk editing (firebird)',
      { tags: ['extendedPath', 'firebird', 'C368047'] },
      () => {
        // Step 1: Create patron group with special symbols
        cy.createUserGroupApi({
          groupName: patronGroupName,
          description: 'ba|sic l;ib gr&oup',
          expirationOffsetInDays: 365,
        }).then((patronGroupBody) => {
          patronGroup = patronGroupBody.id;

          // Step 2: Create test user with special symbols and without firstName
          const testUserModel = {
            username: `AT_368047_TEST_USER_${getRandomPostfix()}`,
            barcode: `T${getRandomPostfix()}`,
            active: true,
            type: 'patron',
            personal: {
              lastName: 'Te@st',
              preferredFirstName: 'Te@st',
              email: 'jhandey@biglibrary.org',
              phone: '2125551212',
            },
          };

          cy.createTempUserParameterized(testUserModel, [], { userType: 'patron', patronGroupName })
            .then((userProperties) => {
              testUser = userProperties;

              // Step 3: Create CSV file with User UUID
              FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, testUser.userId);
            })
            .then(() => {
              // Step 4: Select "Users" radio button => Select "User UUIDs" option => Upload .csv file
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              BulkEditSearchPane.checkUsersRadio();
              BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
              BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
              BulkEditSearchPane.uploadFile(userUUIDsFileName);
              BulkEditSearchPane.waitFileUploading();
              BulkEditSearchPane.verifyMatchedResults(testUser.username);
              BulkEditSearchPane.verifyPaneRecordsCount('1 user');

              // Step 5: Click "Actions" menu => Select "Start bulk edit"
              BulkEditActions.openActions();
              BulkEditActions.openStartBulkEditForm();
              BulkEditActions.verifyBulkEditsAccordionExists();
              BulkEditActions.verifyOptionsDropdown();
              BulkEditActions.verifyRowIcons();
              BulkEditActions.verifyCancelButtonDisabled(false);
              BulkEditActions.verifyConfirmButtonDisabled(true);

              // Step 6: Click "Select option" dropdown => Select "Expiration date" option
              BulkEditActions.selectOption('Expiration date');
              BulkEditActions.replaceWithIsDisabled();

              // Step 7: Click on date picker => Select date different from current => Click "Confirm changes"
              BulkEditActions.fillExpirationDate(newExpirationDate);
              BulkEditActions.verifyPickedDate(newExpirationDate);
              BulkEditActions.verifyConfirmButtonDisabled(false);
              BulkEditActions.confirmChanges();
              BulkEditActions.verifyAreYouSureForm(1);
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                testUser.username,
                'Expiration date',
                formattedExpirationDate,
              );
              BulkEditActions.verifyKeepEditingButtonDisabled(false);
              BulkEditActions.verifyDownloadPreviewButtonDisabled(false);

              // Step 8: Click "Commit changes" button
              BulkEditActions.commitChanges();
              BulkEditSearchPane.waitFileUploading();
              BulkEditActions.verifySuccessBanner(1);
              BulkEditSearchPane.errorsAccordionIsAbsent();
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                testUser.username,
                'Expiration date',
                formattedExpirationDate,
              );

              // Step 9: Navigate to "Users" app => Find and open updated user => Verify changes applied
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
              UsersSearchPane.searchByUsername(testUser.username);
              Users.verifyLastNameOnUserDetailsPane(testUser.personal.lastName);
              Users.verifyExpirationDateOnUserDetailsPane(formattedExpirationDate);
              Users.verifyLastNameOnUserDetailsPane('Te@st');
              Users.verifyPatronGroupOnUserDetailsPane(patronGroupName);
            });
        });
      },
    );
  });
});
