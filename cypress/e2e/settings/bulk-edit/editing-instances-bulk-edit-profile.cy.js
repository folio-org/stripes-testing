import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_TYPES,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  ActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

// Profile factory function
const createProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740233 original instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Original instances profile description',
    entityType: 'INSTANCE',
    ruleDetails: [
      createAdminNoteRule(
        ActionCreators.addToExisting('Original administrative note for instances'),
      ),
      createSuppressFromDiscoveryRule(true, true, true),
    ],
  });
};

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  editedProfileName: `AT_C740233 edited instances bulk edit profile ${getRandomPostfix()}`,
  originalDescription: 'Original instances profile description',
  editedDescription: 'Updated instances profile description with changes',
  originalAdministrativeNote: 'Original administrative note for instances',
  editedAdministrativeNote: 'Updated administrative note for instances',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    beforeEach('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create profile with factory
        const profileBody = createProfileBody();
        cy.createBulkEditProfile(profileBody).then((createdProfile) => {
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
      'C740233 Editing FOLIO instances bulk edit profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C740233'] },
      () => {
        // Step 1: Click on the row with FOLIO instances bulk edit profile from Preconditions
        InstancesBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );

        // Step 2: Click "Actions" menu button
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions({
          edit: true,
          duplicate: true,
          delete: false,
        });

        // Step 3: Click "Edit" button
        InstancesBulkEditProfileView.selectEditProfile();
        InstancesBulkEditProfileForm.verifyFormElements(testData.originalProfileName);

        // Step 4: Verify elements under "Summary" accordion
        InstancesBulkEditProfileForm.verifySummaryAccordionElements();
        InstancesBulkEditProfileForm.verifyMetadataSectionExists();

        // Step 5: Verify elements under "Bulk edits" accordion
        InstancesBulkEditProfileForm.verifySelectedOption(INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileForm.verifyTextInDataTextArea(testData.originalAdministrativeNote);
        InstancesBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          1,
        );
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);
        InstancesBulkEditProfileForm.clickGarbageCanButton(1);
        InstancesBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 6: Edit profile name in "Name*" text box with any value
        InstancesBulkEditProfileForm.fillProfileName(testData.editedProfileName);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 7: Verify options/actions available under "Bulk edits" accordion
        InstancesBulkEditProfileForm.verifyAvailableOptionsAndActions();

        // Step 8: Edit any options/actions under "Bulk edits" accordion
        InstancesBulkEditProfileForm.selectOption(INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileForm.fillTextInDataTextArea(testData.editedAdministrativeNote);

        InstancesBulkEditProfileForm.clickPlusButton();
        InstancesBulkEditProfileForm.verifyAddedNewBulkEditRow();
        InstancesBulkEditProfileForm.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.SET_TRUE, 1);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 9: Edit profile description in "Description" text box with any value
        InstancesBulkEditProfileForm.fillDescription(testData.editedDescription);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfilesPane.verifySuccessToast('updated');
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 11: Verify row with edited profile in the table with profiles
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          testData.editedProfileName,
          testData.editedDescription,
          user,
        );

        // Step 12: Click on the row with edited FOLIO instances bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
        InstancesBulkEditProfileView.verifySelectedOption(INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileView.verifyTextInDataTextArea(testData.editedAdministrativeNote);
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_TRUE, 1);

        // Step 13: Test Cancel functionality with unsaved changes
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.selectEditProfile();
        InstancesBulkEditProfileForm.fillProfileName(`${testData.editedProfileName}_temp`);
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 14: Complete Cancel workflow - Keep editing, then Close without saving
        AreYouSureModal.clickKeepEditing();
        InstancesBulkEditProfileForm.fillDescription('Temporary description change');
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 15: Verify final state without unsaved changes
        InstancesBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
      },
    );
  });
});
