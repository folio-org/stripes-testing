import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import UsersBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/usersBulkEditProfilesPane';
import UsersBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/usersBulkEditProfileForm';
import UsersBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/usersBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  editedProfileName: `AT_C740236 edited users bulk edit profile ${getRandomPostfix()}`,
  originalDescription: 'Original users profile description',
  editedDescription: 'Updated users profile description with changes',
  originalEmailFind: 'example.com',
  editedEmailFind: 'olddomain.com',
  originalEmailReplace: 'newdomain.com',
  editedEmailReplace: 'updateddomain.com',
  originalPatronGroup: 'staff',
  editedPatronGroup: 'faculty',
  expirationDate: new Date(),
  profileBody: {
    name: `AT_C740236 original users bulk edit profile ${getRandomPostfix()}`,
    description: 'Original users profile description',
    locked: false,
    entityType: 'USER',
    ruleDetails: [
      {
        option: 'EMAIL_ADDRESS',
        actions: [
          {
            type: 'FIND_AND_REPLACE',
            initial: 'example.com',
            updated: 'newdomain.com',
          },
        ],
      },
      {
        option: 'PATRON_GROUP',
        actions: [
          {
            type: 'REPLACE_WITH',
            updated: 'staff',
          },
        ],
      },
    ],
  },
};

describe('Bulk edit', () => {
  describe('Profiles', () => {
    beforeEach('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getUserGroups({
          limit: 1,
          query: 'group=="staff"',
        }).then((userPatronGroupId) => {
          testData.profileBody.ruleDetails[1].actions[0].updated = userPatronGroupId;

          cy.createBulkEditProfile(testData.profileBody).then((createdProfile) => {
            testData.originalProfileName = createdProfile.name;
            testData.profileId = createdProfile.id;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickUsersBulkEditProfiles();
        UsersBulkEditProfilesPane.waitLoading();
        UsersBulkEditProfilesPane.verifyPaneElements();
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
    });

    it(
      'C740236 Editing Users bulk edit profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C740236'] },
      () => {
        // Step 1: Click on the row with users bulk edit profile from Preconditions
        UsersBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        UsersBulkEditProfileView.waitLoading();
        UsersBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );

        // Step 2: Click "Actions" menu button
        UsersBulkEditProfileView.clickActionsButton();
        UsersBulkEditProfileView.verifyActionsMenuOptions();

        // Step 3: Click "Edit" button
        UsersBulkEditProfileView.selectEditProfile();
        UsersBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
        // TODO: Uncomment after UIBULKED-693 is done
        // UsersBulkEditProfileForm.verifyMetadataSectionExists();

        // Step 4: Verify elements under "Summary" accordion
        UsersBulkEditProfileForm.verifySummaryAccordionElements();

        // Step 5: Verify elements under "Bulk edits" accordion
        UsersBulkEditProfileForm.verifySelectedOption(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL);
        UsersBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.FIND);
        UsersBulkEditProfileForm.verifyEmailFindText(testData.originalEmailFind);
        UsersBulkEditProfileForm.verifySelectedSecondAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        UsersBulkEditProfileForm.verifyEmailReplaceText(testData.originalEmailReplace);
        UsersBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
          1,
        );
        UsersBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
        UsersBulkEditProfileForm.verifySelectedPatronGroup(testData.originalPatronGroup, 1);
        UsersBulkEditProfileForm.clickGarbageCanButton(1);
        UsersBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 6: Edit profile name in "Name*" text box with any value
        UsersBulkEditProfileForm.fillProfileName(testData.editedProfileName);
        UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 7: Verify options/actions available under "Bulk edits" accordion
        UsersBulkEditProfileForm.verifyAvailableOptionsAndActions();

        // Step 8: Edit any options/actions under "Bulk edits" accordion
        UsersBulkEditProfileForm.selectOption(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL);
        UsersBulkEditProfileForm.fillEmailFindText(testData.editedEmailFind);
        UsersBulkEditProfileForm.fillEmailReplaceText(testData.editedEmailReplace);

        UsersBulkEditProfileForm.clickPlusButton();
        UsersBulkEditProfileForm.verifyAddedNewBulkEditRow();
        UsersBulkEditProfileForm.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
          1,
        );
        UsersBulkEditProfileForm.selectExpirationDate(testData.expirationDate, 1);
        UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 9: Edit profile description in "Description" text box with any value
        UsersBulkEditProfileForm.fillDescription(testData.editedDescription);
        UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        UsersBulkEditProfileForm.clickSaveAndClose();
        UsersBulkEditProfilesPane.verifySuccessToast('updated');
        UsersBulkEditProfilesPane.waitLoading();

        // Step 11: Verify row with edited profile in the table with profiles
        UsersBulkEditProfilesPane.verifyProfileInTable(
          testData.editedProfileName,
          testData.editedDescription,
          user,
        );

        // Step 12: Click on the row with edited users bulk edit profile
        UsersBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        UsersBulkEditProfileView.waitLoading();
        UsersBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
        UsersBulkEditProfileView.verifySelectedOption(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL);
        UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.FIND);
        UsersBulkEditProfileView.verifySelectedSecondAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        UsersBulkEditProfileView.verifyEmailFindText(testData.editedEmailFind);
        UsersBulkEditProfileView.verifyEmailReplaceText(testData.editedEmailReplace);
        UsersBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
          1,
        );
        UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
        UsersBulkEditProfileView.verifySelectedExpirationDate(testData.expirationDate, 1);

        // Step 13: Test Cancel functionality with unsaved changes
        UsersBulkEditProfileView.clickActionsButton();
        UsersBulkEditProfileView.selectEditProfile();
        UsersBulkEditProfileForm.fillProfileName(`${testData.editedProfileName}_temp`);
        UsersBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 14: Complete Cancel workflow - Keep editing, then Close without saving
        AreYouSureModal.clickKeepEditing();
        UsersBulkEditProfileForm.fillDescription('Temporary description change');
        UsersBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        UsersBulkEditProfilesPane.waitLoading();

        // Step 15: Verify final state without unsaved changes
        UsersBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        UsersBulkEditProfileView.waitLoading();
        UsersBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
      },
    );
  });
});
