import { Permissions } from '../../../support/dictionary';
import {
  SettingsDataImport,
  FieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      mappings: {
        item: FieldMappingProfiles.getDefaultMappingProfile({
          existingRecordType: 'ITEM',
        }),
        holding: FieldMappingProfiles.getDefaultMappingProfile({
          existingRecordType: 'HOLDINGS',
        }),
      },
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(testData.mappings).forEach((mapping) => {
          FieldMappingProfiles.createMappingProfileViaApi(mapping);
        });
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.dataImportSettingsPath,
          waiter: SettingsDataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(testData.mappings).forEach((mapping) => {
          FieldMappingProfiles.deleteMappingProfileViaApi(mapping.profile.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C376001 Verify no error appears after switching record types when duplicating existing field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

        // Open field mapping profile view for item records
        const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
          name: testData.mappings.item.profile.name,
          type: 'ITEM',
        });
        FieldMappingProfileView.checkSummaryFieldsConditions([
          { label: 'Name', conditions: { value: testData.mappings.item.profile.name } },
          { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
          { label: 'FOLIO record type', conditions: { value: 'Item' } },
        ]);

        // Close those details by clicking the x at the top left of the screen
        FieldMappingProfileView.clickCloseButton();

        // Open field mapping profile view for Inventory holdings records
        FieldMappingProfiles.openFieldMappingProfileView({
          name: testData.mappings.holding.profile.name,
          type: 'HOLDINGS',
        });
        FieldMappingProfileView.checkSummaryFieldsConditions([
          { label: 'Name', conditions: { value: testData.mappings.holding.profile.name } },
          { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
          { label: 'FOLIO record type', conditions: { value: 'Holdings' } },
        ]);

        // Click "Actions" button, Click "Duplicate" option
        const FieldMappingProfileEditForm = FieldMappingProfileView.clickDuplicateButton();

        // Click "Close" button
        FieldMappingProfileEditForm.clickCloseButton({ closeWoSaving: false });
      },
    );
  });
});
