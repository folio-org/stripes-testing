import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  originalDescription: 'Original instances profile description for locking test',
  originalAdministrativeNote: 'Original administrative note for instances',
  profileBody: {
    name: `AT_C740228 original instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Original instances profile description for locking test',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: 'Original administrative note for instances',
          },
        ],
      },
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
            applyToHoldings: true,
            applyToItems: true,
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
        Permissions.bulkEditSettingsLockEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createBulkEditProfile(testData.profileBody).then((createdProfile) => {
          testData.originalProfileName = createdProfile.name;
          testData.profileId = createdProfile.id;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
    });

    it(
      'C740228 Locking and unlocking bulk edit profile (firebird)',
      { tags: ['smoke', 'firebird', 'C740228'] },
      () => {
        // Step 1: Click "Actions" menu button
        InstancesBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions();

        // Step 2: Click "Edit" button and verify "Lock profile" checkbox under "Summary" accordion
        InstancesBulkEditProfileView.selectEditProfile();
        InstancesBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
        InstancesBulkEditProfileForm.verifySummaryAccordionElements(false);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 3: Check "Lock profile" checkbox
        InstancesBulkEditProfileForm.clickLockProfileCheckbox();
        InstancesBulkEditProfileForm.verifyLockProfileCheckboxChecked(true);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 4: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfilesPane.verifySuccessToast('updated');
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 5: Verify value in "Status" column for the row with edited profile in the table with profiles
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          testData.originalProfileName,
          testData.originalDescription,
          user,
          false,
        );

        // Step 6: Click on the row with edited bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(true);

        // Step 7: Click "Actions" menu button
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions();

        // Step 8: Click "Edit" button and verify "Lock profile" checkbox under "Summary" accordion
        InstancesBulkEditProfileView.selectEditProfile();
        InstancesBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
        InstancesBulkEditProfileForm.verifyLockProfileCheckboxChecked(true);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(true);

        // Step 9: Uncheck "Lock profile" checkbox
        InstancesBulkEditProfileForm.clickLockProfileCheckbox();
        InstancesBulkEditProfileForm.verifyLockProfileCheckboxChecked(false);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfilesPane.verifySuccessToast('updated');
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 11: Verify value in "Status" column for the row with edited profile in the table with profiles
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          testData.originalProfileName,
          testData.originalDescription,
          user,
        );

        // Step 12: Click on the row with edited bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);
      },
    );
  });
});
