import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  LOCATION_NAMES,
  INSTANCE_NOTE_TYPES,
  BULK_EDIT_ACTIONS,
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
  profileName: `AT_C805762 holdings bulk edit profile ${getRandomPostfix()}`,
  profileNameToCancel: `AT_C805762 holdings bulk edit profile to cancel ${getRandomPostfix()}`,
  profileDescription: 'Replace temporary location and add administrative note',
  adminNote: 'Temporary location changed',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      HoldingsBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(testData.profileName);
    });

    // Trillium
    it.skip('C805762 Creating Holdings bulk edit profile (firebird)', { tags: [] }, () => {
      // Step 1: Click "Holdings bulk edit profiles" category under "Inventory profiles" group
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
      BulkEditPane.waitLoading();
      BulkEditPane.clickHoldingsBulkEditProfiles();
      HoldingsBulkEditProfilesPane.waitLoading();
      HoldingsBulkEditProfilesPane.verifyPaneElements();

      // Step 2: Click "New" button
      HoldingsBulkEditProfilesPane.clickNewButton();
      HoldingsBulkEditProfileForm.waitLoading();
      HoldingsBulkEditProfileForm.verifyFormElements('New holdings bulk edit profile');

      // Step 3: Verify elements under "Summary" accordion
      HoldingsBulkEditProfileForm.verifySummaryAccordionElements();

      // Step 4: Verify elements under "Bulk edits" accordion
      HoldingsBulkEditProfileForm.verifyBulkEditsAccordionElements();

      // Step 5: Fill in "Name*" text box and "Description" text box
      HoldingsBulkEditProfileForm.fillProfileName(testData.profileName);
      HoldingsBulkEditProfileForm.fillDescription(testData.profileDescription);
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 6: Select "Temporary holdings location" in "Select option" dropdown
      HoldingsBulkEditProfileForm.selectOption('Temporary holdings location');
      HoldingsBulkEditProfileForm.verifyActionsColumnAppears();
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 7: Select "Replace with" in "Select action" dropdown
      HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
      HoldingsBulkEditProfileForm.verifyDataColumnAppears();
      HoldingsBulkEditProfileForm.verifySelectLocationDropdownExists();
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 8: Select any location in "Select location" dropdown
      HoldingsBulkEditProfileForm.selectLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `);
      HoldingsBulkEditProfileForm.verifyLocationValue(`${LOCATION_NAMES.MAIN_LIBRARY} `);
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 9: Click "Plus" icon in "Actions" column
      HoldingsBulkEditProfileForm.clickPlusButton();
      HoldingsBulkEditProfileForm.verifyAddedNewBulkEditRow();
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 10: Select "Administrative note" and "Add note" with text
      HoldingsBulkEditProfileForm.selectOption(INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE, 1);
      HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
      HoldingsBulkEditProfileForm.fillTextInDataTextArea(testData.adminNote, 1);
      HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 11: Click "Save & close" button
      HoldingsBulkEditProfileForm.clickSaveAndClose();
      HoldingsBulkEditProfileForm.verifyNewProfilePaneAbsent();
      HoldingsBulkEditProfilesPane.verifySuccessToast();
      HoldingsBulkEditProfilesPane.waitLoading();

      // Step 12: Verify row with newly created profile in the table
      HoldingsBulkEditProfilesPane.verifyProfileInTable(
        testData.profileName,
        testData.profileDescription,
        user,
      );

      // Step 13: Click on the row with newly created holdings bulk edit profile
      HoldingsBulkEditProfilesPane.clickProfileRow(testData.profileName);
      HoldingsBulkEditProfileView.waitLoading();
      HoldingsBulkEditProfileView.verifyProfileDetails(
        testData.profileName,
        testData.profileDescription,
      );
      HoldingsBulkEditProfileView.verifySelectedOption('Temporary holdings location');
      HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
      HoldingsBulkEditProfileView.verifySelectedLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `);
      HoldingsBulkEditProfileView.verifySelectedOption(INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE, 1);
      HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
      HoldingsBulkEditProfileView.verifyTextInDataTextArea(testData.adminNote, 1);

      // Step 14: Test Cancel functionality - Click "X" button, then "New" button, populate form, click "Cancel"
      HoldingsBulkEditProfileView.clickCloseFormButton();
      HoldingsBulkEditProfilesPane.clickNewButton();
      HoldingsBulkEditProfileForm.fillProfileName(testData.profileNameToCancel);
      HoldingsBulkEditProfileForm.clickCancel();
      AreYouSureModal.verifyModalElements('There are unsaved changes');

      // Step 15: Click "Keep editing", edit form, click "Cancel", then "Close without saving"
      AreYouSureModal.clickKeepEditing();
      HoldingsBulkEditProfileForm.fillDescription('Additional description for cancel test');
      HoldingsBulkEditProfileForm.clickCancel();
      AreYouSureModal.clickCloseWithoutSaving();
      HoldingsBulkEditProfilesPane.waitLoading();
      HoldingsBulkEditProfilesPane.verifyProfileNotInTable(testData.profileNameToCancel);
    });
  });
});
