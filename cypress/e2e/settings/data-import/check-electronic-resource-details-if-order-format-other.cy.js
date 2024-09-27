import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      mappingProfile: {
        summary: {
          name: `autotest_mapping_profile_name_${getRandomPostfix()}`,
          incomingRecordType: 'MARC Bibliographic',
          existingRecordType: 'Order',
        },
        orderLineInformation: {
          poLineDetails: { orderFormat: 'Other' },
        },
      },
      user: {},
    };

    before('Create test user and login', () => {
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
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C380524 Order field mapping profile: Verify that electronic resource details are not active when Order format is Other in the create screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Following fields are greyed out and **disabled** in the "Cost details" accordions: "Electronic unit price", "Quantity electronic"
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Cost details -> Electronic unit price',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'Cost details -> Quantity electronic',
            conditions: { disabled: true, value: '' },
          },
        ]);

        // Navigate to "Location" accordion, Click "Add location" button
        FieldMappingProfileEditForm.clickAddLocationButton();

        // "Quantity electronic" field is greyed out and **disabled** in the "Location" accordions
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Location -> Quantity electronic',
            conditions: { disabled: true, value: '' },
          },
        ]);

        // Navigate to "E-resources details" accordion
        // Following fields and checkboxes are greyed out and **disabled** in the "E-resources details" accordions:
        // * "Access provider"
        // * "Access provider" Organization look-up
        // * "Activation status"
        // * "Activation due"
        // * "Create inventory"
        // * "Material type"
        // * "Trial"
        // * "Expected activation"
        // * "User limit"
        // * "URL"
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'E-resources details -> Access provider',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> Organization look-up',
            conditions: { disabled: true },
          },
          {
            label: 'E-resources details -> Activation status',
            conditions: { disabled: true, checked: false },
          },
          {
            label: 'E-resources details -> Activation due',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> Create inventory',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> Material type',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> Trial',
            conditions: { disabled: true, checked: false },
          },
          {
            label: 'E-resources details -> Expected activation',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> User limit',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> URL',
            conditions: { disabled: true, value: '' },
          },
        ]);

        // Go to the "PO line details" accordion, Remove "Other" option in the "Order format" field
        FieldMappingProfileEditForm.fillPoLineDetailsProfileFields({
          orderFormat: null,
          clearField: true,
        });

        // Following fields are enabled in the "Cost details" accordions: "Electronic unit price", "Quantity electronic"
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Cost details -> Electronic unit price',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'Cost details -> Quantity electronic',
            conditions: { disabled: false, value: '' },
          },
        ]);

        // "Quantity electronic" field is enabled in the "Location" accordions
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Location -> Quantity electronic',
            conditions: { disabled: false, value: '' },
          },
        ]);

        // #10 Navigate to "E-resources details" accordion
        // Following fields and checkboxes are enabled in the "E-resources details" accordions:
        // * "Access provider"
        // * "Access provider" Organization look-up
        // * "Activation status"
        // * "Activation due"
        // * "Create inventory"
        // * "Material type"
        // * "Trial"
        // * "Expected activation"
        // * "User limit"
        // * "URL"
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'E-resources details -> Access provider',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> Organization look-up',
            conditions: { disabled: false },
          },
          {
            label: 'E-resources details -> Activation status',
            conditions: { disabled: false, checked: false },
          },
          {
            label: 'E-resources details -> Activation due',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> Create inventory',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> Material type',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> Trial',
            conditions: { disabled: false, checked: false },
          },
          {
            label: 'E-resources details -> Expected activation',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> User limit',
            conditions: { disabled: false, value: '' },
          },
          {
            label: 'E-resources details -> URL',
            conditions: { disabled: false, value: '' },
          },
        ]);
      },
    );
  });
});
