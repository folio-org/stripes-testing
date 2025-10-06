import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
  LOCATION_NAMES,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import HoldingsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/holdingsBulkEditProfilesPane';
import HoldingsBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/holdingsBulkEditProfileForm';
import HoldingsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/holdingsBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  editedProfileName: `AT_C740232 edited holdings bulk edit profile ${getRandomPostfix()}`,
  originalDescription: 'Original holdings profile description',
  editedDescription: 'Updated holdings profile description with changes',
  originalAdministrativeNote: 'Original administrative note for holdings',
  editedAdministrativeNote: 'Updated administrative note for holdings',
  profileBody: {
    name: `AT_C740232 original holdings bulk edit profile ${getRandomPostfix()}`,
    description: 'Original holdings profile description',
    locked: false,
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: 'Original administrative note for holdings',
          },
        ],
      },
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
            applyToItems: true,
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
        BulkEditPane.clickHoldingsBulkEditProfiles();
        HoldingsBulkEditProfilesPane.waitLoading();
        HoldingsBulkEditProfilesPane.verifyPaneElements();
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
    });

    it(
      'C740232 Editing Holdings bulk edit profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C740232'] },
      () => {
        // Step 1: Click on the row with holdings bulk edit profile from Preconditions
        HoldingsBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        HoldingsBulkEditProfileView.waitLoading();
        HoldingsBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );

        // Step 2: Click "Actions" menu button
        HoldingsBulkEditProfileView.clickActionsButton();
        HoldingsBulkEditProfileView.verifyActionsMenuOptions({
          edit: true,
          duplicate: true,
          delete: false,
        });

        // Step 3: Click "Edit" button
        HoldingsBulkEditProfileView.selectEditProfile();
        HoldingsBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
        // TODO: Uncomment after UIBULKED-693 is done
        // HoldingsBulkEditProfileForm.verifyMetadataSectionExists();

        // Step 4: Verify elements under "Summary" accordion
        HoldingsBulkEditProfileForm.verifySummaryAccordionElements();

        // Step 5: Verify elements under "Bulk edits" accordion
        HoldingsBulkEditProfileForm.verifySelectedOption(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        HoldingsBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        HoldingsBulkEditProfileForm.verifyTextInDataTextArea(testData.originalAdministrativeNote);
        HoldingsBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          1,
        );
        HoldingsBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);
        HoldingsBulkEditProfileForm.clickGarbageCanButton(1);
        HoldingsBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 6: Edit profile name in "Name*" text box with any value
        HoldingsBulkEditProfileForm.fillProfileName(testData.editedProfileName);
        HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 7: Verify options/actions available under "Bulk edits" accordion
        HoldingsBulkEditProfileForm.verifyAvailableOptionsAndActions();

        // Step 8: Edit any options/actions under "Bulk edits" accordion
        HoldingsBulkEditProfileForm.selectOption('Administrative note');
        HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        HoldingsBulkEditProfileForm.fillTextInDataTextArea(testData.editedAdministrativeNote);

        HoldingsBulkEditProfileForm.clickPlusButton();
        HoldingsBulkEditProfileForm.verifyAddedNewBulkEditRow();
        HoldingsBulkEditProfileForm.selectOption('Permanent holdings location', 1);
        HoldingsBulkEditProfileForm.selectLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `, 1);
        HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 9: Edit profile description in "Description" text box with any value
        HoldingsBulkEditProfileForm.fillDescription(testData.editedDescription);
        HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        HoldingsBulkEditProfileForm.clickSaveAndClose();
        HoldingsBulkEditProfilesPane.verifySuccessToast('updated');
        HoldingsBulkEditProfilesPane.waitLoading();

        // Step 11: Verify row with edited profile in the table with profiles
        HoldingsBulkEditProfilesPane.verifyProfileInTable(
          testData.editedProfileName,
          testData.editedDescription,
          user,
        );

        // Step 12: Click on the row with edited holdings bulk edit profile
        HoldingsBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        HoldingsBulkEditProfileView.waitLoading();
        HoldingsBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
        HoldingsBulkEditProfileView.verifySelectedOption(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        HoldingsBulkEditProfileView.verifyTextInDataTextArea(testData.editedAdministrativeNote);
        HoldingsBulkEditProfileView.verifySelectedOption('Permanent holdings location', 1);
        HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
        HoldingsBulkEditProfileView.verifySelectedLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `, 1);

        // Step 13: Test Cancel functionality with unsaved changes
        HoldingsBulkEditProfileView.clickActionsButton();
        HoldingsBulkEditProfileView.selectEditProfile();
        HoldingsBulkEditProfileForm.fillProfileName(`${testData.editedProfileName}_temp`);
        HoldingsBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 14: Complete Cancel workflow - Keep editing, then Close without saving
        AreYouSureModal.clickKeepEditing();
        HoldingsBulkEditProfileForm.fillDescription('Temporary description change');
        HoldingsBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        HoldingsBulkEditProfilesPane.waitLoading();

        // Step 15: Verify final state without unsaved changes
        HoldingsBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        HoldingsBulkEditProfileView.waitLoading();
        HoldingsBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
      },
    );
  });
});
