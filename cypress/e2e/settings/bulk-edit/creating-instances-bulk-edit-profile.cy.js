import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  profileName: `AT_C805763 FOLIO instances bulk edit profile ${getRandomPostfix()}`,
  profileNameToCancel: `AT_C805763 FOLIO instances bulk edit profile to cancel ${getRandomPostfix()}`,
  profileDescription: 'Add statistical code and general note',
  statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
  generalNote: 'Statistical code(s) added',
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
      InstancesBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(testData.profileName);
    });

    // Trillium
    it.skip('C805763 Creating FOLIO instances bulk edit profile (firebird)', { tags: [] }, () => {
      // Step 1: Click "Instances bulk edit profiles" category under "Inventory profiles" group
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
      BulkEditPane.waitLoading();
      BulkEditPane.clickInstancesBulkEditProfiles();
      InstancesBulkEditProfilesPane.waitLoading();
      InstancesBulkEditProfilesPane.verifyPaneElements();

      // Step 2: Click "Actions" menu button
      InstancesBulkEditProfilesPane.clickActionsButton();
      InstancesBulkEditProfilesPane.verifyActionsMenuOptions({
        edit: true,
        duplicate: true,
        delete: false,
      });

      // Step 3: Select "New FOLIO instances bulk edit profile" option
      InstancesBulkEditProfilesPane.selectNewFolioInstancesProfile();
      InstancesBulkEditProfileForm.waitLoading();
      InstancesBulkEditProfileForm.verifyFormElements('New FOLIO instances bulk edit profile');

      // Step 4: Verify elements under "Summary" accordion
      InstancesBulkEditProfileForm.verifySummaryAccordionElements();

      // Step 5: Verify elements under "Bulk edits" accordion
      InstancesBulkEditProfileForm.verifyBulkEditsAccordionElements();

      // Step 6: Fill in "Name*" text box and "Description" text box
      InstancesBulkEditProfileForm.fillProfileName(testData.profileName);
      InstancesBulkEditProfileForm.fillDescription(testData.profileDescription);
      InstancesBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 7: Select "Statistical code" in "Select option" dropdown
      InstancesBulkEditProfileForm.selectOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
      );
      InstancesBulkEditProfileForm.verifyActionsColumnAppears();
      InstancesBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 8: Select "Add" in "Select action" dropdown
      InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD);
      InstancesBulkEditProfileForm.verifyDataColumnAppears();
      InstancesBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 9: Select any statistical code(s) in "Select statistical code" dropdown
      InstancesBulkEditProfileForm.selectStatisticalCode(testData.statisticalCode);
      InstancesBulkEditProfileForm.verifyStatisticalCodeSelected(testData.statisticalCode);
      InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 10: Click "Plus" icon in "Actions" column
      InstancesBulkEditProfileForm.clickPlusButton();
      InstancesBulkEditProfileForm.verifyAddedNewBulkEditRow();
      InstancesBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 11: Select "General note", "Add note" with text and check "Staff only"
      InstancesBulkEditProfileForm.selectOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        1,
      );
      InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
      InstancesBulkEditProfileForm.fillTextInDataTextArea(testData.generalNote, 1);
      InstancesBulkEditProfileForm.checkStaffOnlyCheckbox(1);
      InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 12: Click "Save & close" button
      InstancesBulkEditProfileForm.clickSaveAndClose();
      InstancesBulkEditProfileForm.verifyNewProfilePaneAbsent();
      InstancesBulkEditProfilesPane.verifySuccessToast();
      InstancesBulkEditProfilesPane.waitLoading();

      // Step 13: Verify row with newly created profile in the table
      InstancesBulkEditProfilesPane.verifyProfileInTable(
        testData.profileName,
        testData.profileDescription,
        user,
      );

      // Step 14: Click on the row with newly created FOLIO instances bulk edit profile
      InstancesBulkEditProfilesPane.clickProfileRow(testData.profileName);
      InstancesBulkEditProfileView.waitLoading();
      InstancesBulkEditProfileView.verifyProfileDetails(
        testData.profileName,
        testData.profileDescription,
      );
      InstancesBulkEditProfileView.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
      );
      InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD);
      InstancesBulkEditProfileView.verifySelectedStatisticalCode(testData.statisticalCode);
      InstancesBulkEditProfileView.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        1,
      );
      InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
      InstancesBulkEditProfileView.verifyTextInDataTextArea(testData.generalNote, 1);
      InstancesBulkEditProfileView.verifyStaffOnlyCheckboxChecked(1);

      // Step 15: Test Cancel functionality with Actions menu
      InstancesBulkEditProfileView.clickCloseFormButton();
      InstancesBulkEditProfilesPane.clickActionsButton();
      InstancesBulkEditProfilesPane.selectNewFolioInstancesProfile();
      InstancesBulkEditProfileForm.fillProfileName(testData.profileNameToCancel);
      InstancesBulkEditProfileForm.clickCancel();
      AreYouSureModal.verifyModalElements('There are unsaved changes');

      // Step 16: Complete Cancel workflow - Keep editing, then Close without saving
      AreYouSureModal.clickKeepEditing();
      InstancesBulkEditProfileForm.fillDescription('Additional description for cancel test');
      InstancesBulkEditProfileForm.clickCancel();
      AreYouSureModal.clickCloseWithoutSaving();
      InstancesBulkEditProfilesPane.waitLoading();
      InstancesBulkEditProfilesPane.verifyProfileNotInTable(testData.profileNameToCancel);
    });
  });
});
