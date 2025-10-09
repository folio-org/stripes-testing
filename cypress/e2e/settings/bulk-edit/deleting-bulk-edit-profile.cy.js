import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import DeleteProfileModal from '../../../support/fragments/settings/bulk-edit/deleteProfileModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  unlockedProfileName: null, // Will be assigned after profile creation
  lockedProfileName: null, // Will be assigned after profile creation
  unlockedProfileId: null,
  lockedProfileId: null,
  originalDescription: 'Original instances profile description for deletion test',
  originalAdministrativeNote: 'Original administrative note for instances',
  unlockedProfileBody: {
    name: `AT_C740230 unlocked instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Original instances profile description for deletion test',
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
  lockedProfileBody: {
    name: `AT_C740230 locked instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Locked instances profile description for deletion test',
    locked: true,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: 'Administrative note for locked profile',
          },
        ],
      },
    ],
  },
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    beforeEach('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditSettingsDelete.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create unlocked profile
        cy.createBulkEditProfile(testData.unlockedProfileBody).then((createdProfile) => {
          testData.unlockedProfileName = createdProfile.name;
          testData.unlockedProfileId = createdProfile.id;
        });

        // Create locked profile
        cy.createBulkEditProfile(testData.lockedProfileBody).then((createdProfile) => {
          testData.lockedProfileName = createdProfile.name;
          testData.lockedProfileId = createdProfile.id;
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
      if (testData.unlockedProfileId) cy.deleteBulkEditProfile(testData.unlockedProfileId, true);
      cy.deleteBulkEditProfile(testData.lockedProfileId, true);
    });

    it(
      'C740230 Deleting bulk edit profile (firebird)',
      { tags: ['smoke', 'firebird', 'C740230'] },
      () => {
        // Step 1: Click "Actions" menu button
        InstancesBulkEditProfilesPane.clickProfileRow(testData.unlockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.unlockedProfileName,
          testData.originalDescription,
        );
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions({
          edit: true,
          duplicate: true,
          delete: true,
        });

        // Step 2: Click "Delete" button
        InstancesBulkEditProfileView.selectDeleteProfile();
        DeleteProfileModal.verifyModalElements('FOLIO instances', testData.unlockedProfileName);

        // Step 3: Click "Cancel" button
        DeleteProfileModal.clickCancelButton();
        DeleteProfileModal.verifyModalAbsent();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.unlockedProfileName,
          testData.originalDescription,
        );

        // Step 4: Click "Actions" menu button, Click "Delete" button, Click "Delete" button in appeared modal
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.selectDeleteProfile();
        DeleteProfileModal.verifyModalElements('FOLIO instances', testData.unlockedProfileName);
        DeleteProfileModal.clickDeleteButton();
        DeleteProfileModal.verifyModalAbsent();
        InstancesBulkEditProfilesPane.verifySuccessToast('deleted');
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyProfileNotInTable(testData.unlockedProfileName);
        // Mark as deleted so cleanup doesn't try to delete again
        testData.unlockedProfileId = null;

        // Step 5: Open locked bulk edit profile and verify limited actions menu
        InstancesBulkEditProfilesPane.clickProfileRow(testData.lockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.lockedProfileName,
          testData.lockedProfileBody.description,
        );
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(true);
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions({
          edit: false,
          duplicate: true,
          delete: false,
        });
      },
    );
  });
});
