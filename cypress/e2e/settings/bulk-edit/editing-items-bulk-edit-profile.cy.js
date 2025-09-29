import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_NOTE_TYPES,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import ItemsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import ItemsBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/itemsBulkEditProfileForm';
import ItemsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/itemsBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  editedProfileName: `AT_C740222 edited items bulk edit profile ${getRandomPostfix()}`,
  originalDescription: 'Original profile description',
  editedDescription: 'Updated profile description with changes',
  originalAdministrativeNote: 'Original administrative note',
  editedAdministrativeNote: 'Updated administrative note',
  profileBody: {
    name: `AT_C740222 original items bulk edit profile ${getRandomPostfix()}`,
    description: 'Original profile description',
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: 'Original administrative note',
          },
        ],
      },
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
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
        BulkEditPane.clickItemsBulkEditProfiles();
        ItemsBulkEditProfilesPane.waitLoading();
        ItemsBulkEditProfilesPane.verifyPaneElements();
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
    });

    it(
      'C740222 Editing Items bulk edit profile (firebird)',
      { tags: ['smoke', 'firebird', 'C740222'] },
      () => {
        // Step 1: Click on the row with items bulk edit profile from Preconditions
        ItemsBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
        ItemsBulkEditProfileView.waitLoading();
        ItemsBulkEditProfileView.verifyProfileDetails(
          testData.originalProfileName,
          testData.originalDescription,
        );

        // Step 2: Click "Actions" menu button
        ItemsBulkEditProfileView.clickActionsButton();
        ItemsBulkEditProfileView.verifyActionsMenuOptions({
          edit: true,
          duplicate: true,
          delete: false,
        });

        // Step 3: Click "Edit" button
        ItemsBulkEditProfileView.selectEditProfile();
        ItemsBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
        // TODO: Uncomment after UIBULKED-693 is done
        // ItemsBulkEditProfileForm.verifyMetadataSectionExists();

        // Step 4: Verify elements under "Summary" accordion
        ItemsBulkEditProfileForm.verifySummaryAccordionElements();

        // Step 5: Verify elements under "Bulk edits" accordion
        ItemsBulkEditProfileForm.verifySelectedOption(ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        ItemsBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        ItemsBulkEditProfileForm.verifyTextInDataTextArea(testData.originalAdministrativeNote);
        ItemsBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          1,
        );
        ItemsBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);
        ItemsBulkEditProfileForm.clickGarbageCanButton(1);
        ItemsBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 6: Edit profile name in "Name*" text box with any value
        ItemsBulkEditProfileForm.fillProfileName(testData.editedProfileName);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 7: Verify options/actions available under "Bulk edits" accordion
        ItemsBulkEditProfileForm.verifyAvailableOptionsAndActions();

        // Step 8: Edit any options/actions under "Bulk edits" accordion
        ItemsBulkEditProfileForm.selectOption(ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        ItemsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        ItemsBulkEditProfileForm.fillTextInDataTextArea(testData.editedAdministrativeNote);

        ItemsBulkEditProfileForm.clickPlusButton();
        ItemsBulkEditProfileForm.verifyAddedNewBulkEditRow();
        ItemsBulkEditProfileForm.selectOption('Item status', 1);
        ItemsBulkEditProfileForm.selectItemStatus('Unavailable', 1);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 9: Edit profile description in "Description" text box with any value
        ItemsBulkEditProfileForm.fillDescription(testData.editedDescription);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        ItemsBulkEditProfileForm.clickSaveAndClose();
        ItemsBulkEditProfilesPane.verifySuccessToast('updated');
        ItemsBulkEditProfilesPane.waitLoading();

        // Step 11: Verify row with edited profile in the table with profiles
        ItemsBulkEditProfilesPane.verifyProfileInTable(
          testData.editedProfileName,
          testData.editedDescription,
          user,
        );

        // Step 12: Click on the row with edited items bulk edit profile
        ItemsBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        ItemsBulkEditProfileView.waitLoading();
        ItemsBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
        ItemsBulkEditProfileView.verifySelectedOption(ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE);
        ItemsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        ItemsBulkEditProfileView.verifyTextInDataTextArea(testData.editedAdministrativeNote);
        ItemsBulkEditProfileView.verifySelectedOption('Item status', 1);
        ItemsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
        ItemsBulkEditProfileView.verifySelectedItemStatus('Unavailable', 1);

        // Step 13: Test Cancel functionality with unsaved changes
        ItemsBulkEditProfileView.clickActionsButton();
        ItemsBulkEditProfileView.selectEditProfile();
        ItemsBulkEditProfileForm.fillProfileName(`${testData.editedProfileName}_temp`);
        ItemsBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 14: Complete Cancel workflow - Keep editing, then Close without saving
        AreYouSureModal.clickKeepEditing();
        ItemsBulkEditProfileForm.fillDescription('Temporary description change');
        ItemsBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        ItemsBulkEditProfilesPane.waitLoading();

        // Step 15: Verify final state without unsaved changes
        ItemsBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
        ItemsBulkEditProfileView.waitLoading();
        ItemsBulkEditProfileView.verifyProfileDetails(
          testData.editedProfileName,
          testData.editedDescription,
        );
      },
    );
  });
});
