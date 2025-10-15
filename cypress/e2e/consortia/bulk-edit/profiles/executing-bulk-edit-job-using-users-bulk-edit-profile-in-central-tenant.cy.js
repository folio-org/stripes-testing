import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import {
  createBulkEditProfileBody,
  ActionCreators,
  UsersRules,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';

const { createEmailAddressRule, createPatronGroupRule } = UsersRules;

// Profile factory functions
const createMainProfileBody = (facultyPatronGroupId) => {
  return createBulkEditProfileBody({
    name: `AT_C805760_UsersProfile_${getRandomPostfix()}`,
    description: 'Test users bulk edit profile for executing bulk edit job in central tenant',
    entityType: 'USER',
    ruleDetails: [
      createEmailAddressRule(ActionCreators.findAndReplace('test', 'TEST')),
      createPatronGroupRule(ActionCreators.replaceWith(facultyPatronGroupId)),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_UsersProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'USER',
    ruleDetails: [createEmailAddressRule(ActionCreators.findAndRemove('example'))],
  });
};

const testData = {
  profileIds: [],
  searchText: 'test',
  expectedUpdatedEmail: 'TEST@folio.org',
  facultyPatronGroupName: 'faculty',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          // Get patron group ID and create test users
          cy.getUserGroups({ limit: 1, query: `group=="${testData.facultyPatronGroupName}"` }).then(
            (facultyPatronGroup) => {
              testData.facultyPatronGroupId = facultyPatronGroup;

              // Create profiles and set patron group ID
              const profileBody = createMainProfileBody(testData.facultyPatronGroupId);

              cy.createBulkEditProfile(profileBody).then((profile) => {
                testData.profileName = profile.name;
                testData.profileDescription = profile.description;
                testData.profileIds.push(profile.id);
              });

              cy.createBulkEditProfile(createSecondProfileBody()).then((profile) => {
                testData.secondProfileName = profile.name;
                testData.profileIds.push(profile.id);
              });
            },
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(usersFieldValues.userEmail);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.searchText);
          QueryModal.addNewRow();
          QueryModal.selectField(usersFieldValues.userId, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.user.userId, 1);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            testData.queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
              interceptedUuid,
              true,
            );
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));
        BulkEditFiles.deleteAllDownloadedFiles(testData.queryFileNames);
      });

      // Trillium
      it.skip(
        'C805760 ECS | Executing bulk edit job using Users bulk edit profile in Central tenant (Query) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
          );

          // Step 3: Click "Select users bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('users');
          SelectBulkEditProfileModal.waitLoading('users');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing users bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfileNumberMatchesNumberInSettings('users');
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C805760');
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.searchProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

          // Step 6: Click on the row with Users bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('users');
          BulkEditActions.verifyAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
              value: testData.expectedUpdatedEmail,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: testData.facultyPatronGroupName,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.user.barcode,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            testData.user.barcode,
            editedHeaderValues,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.user.barcode,
            editedHeaderValues,
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            testData.user.barcode,
            editedHeaderValues,
          );

          // Step 10: Navigate to "Users" app, Search for the recently edited Users,
          // Verify that made changes have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(testData.user.username);
          Users.verifyPatronGroupOnUserDetailsPane(testData.facultyPatronGroupName);
          UsersCard.openContactInfo();
          UsersCard.verifyEmail(testData.expectedUpdatedEmail);
        },
      );
    });
  });
});
