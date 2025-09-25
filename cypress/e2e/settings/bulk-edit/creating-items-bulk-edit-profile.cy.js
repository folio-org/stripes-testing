import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES, LOCATION_NAMES, BULK_EDIT_ACTIONS } from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import ItemsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import ItemsBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/itemsBulkEditProfileForm';
import ItemsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/itemsBulkEditProfileView';
import SelectLocationModal from '../../../support/fragments/bulk-edit/select-location-modal';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  profileName: `AT_C740214 items bulk edit profile ${getRandomPostfix()}`,
  profileNameToCancel: `AT_C740214 items bulk edit profile to cancel ${getRandomPostfix()}`,
  profileDescription: 'Replace temporary location and status',
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

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((location) => {
          testData.location = location;
          Institutions.getInstitutionByIdViaApi(location.institutionId).then((institution) => {
            testData.institution = institution;
            Campuses.getViaApi().then(({ loccamps }) => {
              testData.campus = loccamps.find((campus) => campus.id === location.campusId);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      ItemsBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(testData.profileName);
    });

    it(
      'C740214 Creating Items bulk edit profile (firebird)',
      { tags: ['smoke', 'firebird', 'C740214'] },
      () => {
        // Step 1: Navigate to Settings > Bulk edit and click "Items bulk edit profiles"
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickItemsBulkEditProfiles();
        ItemsBulkEditProfilesPane.waitLoading();
        ItemsBulkEditProfilesPane.verifyPaneElements();

        // Step 2: Click "New" button
        ItemsBulkEditProfilesPane.clickNewButton();
        ItemsBulkEditProfileForm.waitLoading();
        ItemsBulkEditProfileForm.verifyFormElements('New items bulk edit profile');

        // Step 3: Verify elements under "Summary" accordion
        ItemsBulkEditProfileForm.verifySummaryAccordionElements();

        // Step 4: Verify elements under "Bulk edits" accordion
        ItemsBulkEditProfileForm.verifyBulkEditsAccordionElements();

        // Step 5: Fill in Name and Description fields
        ItemsBulkEditProfileForm.fillProfileName(testData.profileName);
        ItemsBulkEditProfileForm.fillDescription(testData.profileDescription);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 6: Select "Temporary item location" in dropdown
        ItemsBulkEditProfileForm.selectOption('Temporary item location');
        ItemsBulkEditProfileForm.verifyActionsColumnAppears();
        ItemsBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 7: Select "Replace with" in action dropdown
        ItemsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        ItemsBulkEditProfileForm.verifyDataColumnAppears();
        ItemsBulkEditProfileForm.verifySelectLocationDropdownExists();
        ItemsBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 8: Click "Location look-up" link
        ItemsBulkEditProfileForm.clickLocationLookup();
        SelectLocationModal.waitLoading('temporary');
        SelectLocationModal.verifySelectLocationModal();

        // Step 9: Select location elements and save
        SelectLocationModal.fillInSelectLocationForm(
          testData.institution.name,
          testData.campus.name,
          testData.location.name,
        );
        ItemsBulkEditProfileForm.verifyLocationValue(`${LOCATION_NAMES.MAIN_LIBRARY} `);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 10: Click "Plus" icon to add new row
        ItemsBulkEditProfileForm.clickPlusButton();
        ItemsBulkEditProfileForm.verifyAddedNewBulkEditRow();
        ItemsBulkEditProfileForm.verifySaveButtonDisabled();

        // Step 11: Select "Item status" and choose status
        ItemsBulkEditProfileForm.selectOption('Item status', 1);
        ItemsBulkEditProfileForm.selectItemStatus('Unavailable', 1);
        ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 12: Click "Save & close" button
        ItemsBulkEditProfileForm.clickSaveAndClose();
        ItemsBulkEditProfileForm.verifyNewProfilePaneAbsent();
        ItemsBulkEditProfilesPane.verifySuccessToast('Profile successfully created.');
        ItemsBulkEditProfilesPane.waitLoading();

        // Step 13: Verify newly created profile row in table
        ItemsBulkEditProfilesPane.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          user,
        );

        // Step 14: Click on newly created profile row
        ItemsBulkEditProfilesPane.clickProfileRow(testData.profileName);
        ItemsBulkEditProfileView.waitLoading();
        ItemsBulkEditProfileView.verifyProfileDetails(
          testData.profileName,
          testData.profileDescription,
        );
        ItemsBulkEditProfileView.verifySelectedOption('Temporary item location');
        ItemsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        ItemsBulkEditProfileView.verifySelectedLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `);
        ItemsBulkEditProfileView.verifySelectedOption('Item status', 1);
        ItemsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
        ItemsBulkEditProfileView.verifySelectedItemStatus('Unavailable', 1);

        // Step 15: Test Cancel functionality with unsaved changes
        ItemsBulkEditProfileView.clickCloseFormButton();
        ItemsBulkEditProfilesPane.clickNewButton();
        ItemsBulkEditProfileForm.fillProfileName(testData.profileNameToCancel);
        ItemsBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 16: Test "Close without saving" functionality
        AreYouSureModal.clickKeepEditing();
        ItemsBulkEditProfileForm.fillDescription('Additional description');
        ItemsBulkEditProfileForm.clickCancel();
        AreYouSureModal.clickCloseWithoutSaving();
        ItemsBulkEditProfilesPane.waitLoading();
        ItemsBulkEditProfilesPane.verifyProfileNotInTable(testData.profileNameToCancel);
      },
    );
  });
});
