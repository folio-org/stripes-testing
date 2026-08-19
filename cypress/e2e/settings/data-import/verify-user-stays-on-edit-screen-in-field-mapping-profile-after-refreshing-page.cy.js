import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const mappingProfile = {
      name: `AT_C365591_FieldMappingProfile_${randomPostfix}`,
    };
    const updatedProfileName = `AT_C365591_FieldMappingProfile_updated_${randomPostfix}`;
    const saveButtonText = 'Save as profile & Close';

    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
        (response) => {
          mappingProfile.id = response.body.id;
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user?.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C365591 Verify that user stays on edit screen in field mapping profile after refreshing page (promin)',
      { tags: ['extendedPath', 'promin', 'C365591'] },
      () => {
        // Steps 1-3: Navigate to Settings > Data Import > Field mapping profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Step 4: Open the created (non-default) mapping profile
        FieldMappingProfiles.openFieldMappingProfileView({ name: mappingProfile.name });

        // Step 5: Duplicate → "New field mapping profile" form opens with pre-populated data
        const editForm = FieldMappingProfileView.clickDuplicateButton();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        editForm.verifyName(mappingProfile.name);

        // Step 6: Refresh → user stays on form; Actions button absent; save button disabled
        cy.reload();
        editForm.waitLoading();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        editForm.checkButtonsConditions([
          { label: saveButtonText, conditions: { disabled: true } },
        ]);

        // Step 7: Update name → save button becomes enabled
        NewFieldMappingProfile.addName(updatedProfileName);
        editForm.checkButtonsConditions([
          { label: saveButtonText, conditions: { disabled: false } },
        ]);

        // Step 8: Click X → "Are you sure?" modal
        // Step 9: Close without saving → redirected back to view of original profile
        editForm.clickCloseButton({ closeWoSaving: true });
        FieldMappingProfileView.waitLoading();
        FieldMappingProfileView.verifyProfileName(mappingProfile.name);

        // Step 10: Close the detail view
        FieldMappingProfileView.clickCloseButton();
        FieldMappingProfiles.waitLoading();

        // Step 11: Repeat steps 4-5 — open profile again and duplicate; form opens
        FieldMappingProfiles.openFieldMappingProfileView({ name: mappingProfile.name });
        FieldMappingProfileView.clickDuplicateButton();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        editForm.verifyName(mappingProfile.name);
      },
    );
  });
});
