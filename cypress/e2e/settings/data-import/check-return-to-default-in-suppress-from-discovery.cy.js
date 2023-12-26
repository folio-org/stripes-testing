import { including } from '@interactors/html';

import { Permissions } from '../../../support/dictionary';
import {
  SettingsDataImport,
  FieldMappingProfiles,
  FieldMappingProfileView,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      profileName: '',
      user: {},
    };

    before('Create test user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      testData.profileName = `autotest_mapping_profile_name_${getRandomPostfix()}`;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.dataImportSettingsPath,
        waiter: SettingsDataImport.waitLoading,
      });
    });

    afterEach('Delete mapping profile', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.profileName);
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    [
      {
        description:
          'C377016 Verify the possibility to return to the defaults values in dropdown with "Delete all existing values" for Items (folijet) (TaaS)',
        existingRecordType: 'Item',
      },
      {
        description:
          'C377017 Verify the possibility to return to the defaults values in dropdown with "Delete all existing values" for Holdings (folijet) (TaaS)',
        existingRecordType: 'Holdings',
      },
    ].forEach(({ description, existingRecordType }) => {
      it(description, { tags: ['extendedPath', 'folijet'] }, () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: {
            name: testData.profileName,
            incomingRecordType: 'MARC Bibliographic',
            existingRecordType,
          },
          adminData: { suppressFromDiscovery: 'Mark for all affected records' },
          electronicAccess: { value: 'Delete all existing values' },
        });

        // Change the value in "Suppress from discovery" dropdown back to "Select checkbox field mapping" option
        // Change the value in "Electronic Access" dropdown back to "Select action" option
        FieldMappingProfileEditForm.fillMappingProfileFields({
          adminData: { suppressFromDiscovery: 'Select сheckbox field mapping' },
          electronicAccess: { value: 'Select action' },
        });

        // Populate "Suppress from discovery" and "Electronic Access" dropdowns with the values from step 2
        FieldMappingProfileEditForm.fillMappingProfileFields({
          adminData: { suppressFromDiscovery: 'Mark for all affected records' },
          electronicAccess: { value: 'Delete all existing values' },
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();
        FieldMappingProfileView.checkAdminDataFieldsConditions([
          {
            label: 'Suppress from discovery',
            conditions: { value: 'Mark for all affected records' },
          },
        ]);
        FieldMappingProfileView.checkElectronicAccessFieldsConditions([
          { label: 'Electronic access', conditions: { value: 'Delete all existing values' } },
        ]);

        // Click "Actions" button, Select "Edit" option
        FieldMappingProfileView.clickEditButton();

        // Change the value in "Suppress from discovery" dropdown back to "Select checkbox field mapping" option
        // Change the value in "Electronic Access" dropdown back to "Select action" option
        FieldMappingProfileEditForm.fillMappingProfileFields({
          adminData: { suppressFromDiscovery: 'Select сheckbox field mapping' },
          electronicAccess: { value: 'Select action' },
        });

        // Click "Save as profile & Close" button
        // * The detail view page of the updated profile is shown
        FieldMappingProfileEditForm.clickSaveAndCloseButton();
        FieldMappingProfileView.checkAdminDataFieldsConditions([
          {
            label: 'Suppress from discovery',
            conditions: { value: 'No value set-' },
          },
        ]);
        FieldMappingProfileView.checkElectronicAccessFieldsConditions([
          { label: 'Electronic access', conditions: { value: including('No value set-') } },
        ]);
      });
    });
  });
});
