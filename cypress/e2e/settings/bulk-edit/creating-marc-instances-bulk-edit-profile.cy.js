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
  profileName: `AT_C805764 Test MARC instances bulk edit profile ${getRandomPostfix()}`,
  profileNameToCancel: `AT_C805764 Test MARC instances profile to cancel ${getRandomPostfix()}`,
  profileDescription: 'Add electronic access and suppress from discovery',
  marcField: '856',
  indicator1: '4',
  indicator2: '2',
  subfield: 'u',
  electronicAccessUrl: 'http://www.cgiar.org/ifpri/reports/0297rpt/0297-ft.htm',
  additionalSubfield: '3',
  additionalSubfieldData: 'French version',
};

describe('Bulk edit', () => {
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
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InstancesBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(testData.profileName);
    });

    it(
      'C805764 Creating MARC instances bulk edit profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C805764'] },
      () => {
        // Step 1: Click "Actions" menu button and select "New instances with source MARC bulk edit profile" option
        InstancesBulkEditProfilesPane.clickActionsButton();
        InstancesBulkEditProfilesPane.verifyActionsMenuOptions();
        InstancesBulkEditProfilesPane.selectNewMarcInstancesProfile();
        InstancesBulkEditProfileForm.waitLoadingMarcProfile();
        InstancesBulkEditProfileForm.verifyFormElements(
          'New instances with source MARC bulk edit profile',
        );
        InstancesBulkEditProfileForm.verifyBulkEditForMarcInstancesAccordionExists();

        // Step 2: Verify elements under "Summary" accordion
        InstancesBulkEditProfileForm.verifySummaryAccordionElements();

        // Step 3: Verify elements under "Bulk edits for administrative data" accordion
        InstancesBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 4: Verify elements under "Bulk edits for instances with source MARC" accordion
        InstancesBulkEditProfileForm.verifyBulkEditForMarcInstancesAccordionElements();

        // Step 5: Fill in "Name*" text box and "Description" text box
        InstancesBulkEditProfileForm.fillProfileName(testData.profileName);
        InstancesBulkEditProfileForm.fillDescription(testData.profileDescription);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 6: Select "Suppress from discovery" in administrative data dropdown
        InstancesBulkEditProfileForm.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        InstancesBulkEditProfileForm.verifyActionsColumnAppears();
        InstancesBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 7: Select "Set true" in "Select action" dropdown
        InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.SET_TRUE);
        InstancesBulkEditProfileForm.verifyApplyToCheckboxes();
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 8: Configure MARC field settings for electronic access
        InstancesBulkEditProfileForm.fillInTagAndIndicatorsAndSubfield(
          testData.marcField,
          testData.indicator1,
          testData.indicator2,
          testData.subfield,
        );
        InstancesBulkEditProfileForm.selectMarcAction(BULK_EDIT_ACTIONS.ADD);
        InstancesBulkEditProfileForm.fillInDataTextAreaForMarcInstance(
          testData.electronicAccessUrl,
        );
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 9: Add additional subfield
        InstancesBulkEditProfileForm.selectSecondMarcAction(BULK_EDIT_ACTIONS.ADDITIONAL_SUBFIELD);
        InstancesBulkEditProfileForm.fillInSubfieldInSubRow(testData.additionalSubfield);
        InstancesBulkEditProfileForm.fillInDataInSubRow(testData.additionalSubfieldData);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfileForm.verifyNewMarcProfilePaneAbsent();
        InstancesBulkEditProfilesPane.verifySuccessToast();
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 11: Verify row with newly created profile in the table
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          user,
        );

        // Step 12: Click on the row with newly created MARC instances bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(testData.profileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.profileName,
          testData.profileDescription,
        );
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_TRUE);
        InstancesBulkEditProfileView.verifyApplyToCheckboxes();
        InstancesBulkEditProfileView.verifyTagAndIndicatorsAndSubfieldValues(
          testData.marcField,
          testData.indicator1,
          testData.indicator2,
          testData.subfield,
        );
        InstancesBulkEditProfileView.verifySelectedMarcAction(BULK_EDIT_ACTIONS.ADD);
        InstancesBulkEditProfileView.verifyDataTextAreaForMarcInstance(
          testData.electronicAccessUrl,
        );
        InstancesBulkEditProfileView.verifySelectedSecondMarcAction(
          BULK_EDIT_ACTIONS.ADDITIONAL_SUBFIELD,
        );
        InstancesBulkEditProfileView.verifySubfieldInSubRow(testData.additionalSubfield);
        InstancesBulkEditProfileView.verifySelectedActionInSubRow(BULK_EDIT_ACTIONS.ADD);
        InstancesBulkEditProfileView.verifyDataTextAreaInSubRow(testData.additionalSubfieldData);

        // Step 13: Test Cancel functionality - populate form and click Cancel
        InstancesBulkEditProfileView.clickCloseFormButton();
        InstancesBulkEditProfilesPane.clickActionsButton();
        InstancesBulkEditProfilesPane.selectNewMarcInstancesProfile();
        InstancesBulkEditProfileForm.fillProfileName(testData.profileNameToCancel);
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 14: Complete Cancel workflow - Keep editing, then Close without saving
        AreYouSureModal.clickKeepEditing();
        InstancesBulkEditProfileForm.fillDescription('Additional description for cancel test');
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyProfileNotInTable(testData.profileNameToCancel);
      },
    );
  });
});
