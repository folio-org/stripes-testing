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
      profileName: `autotest_mapping_profile_name_${getRandomPostfix()}`,
      existingRecordTypes: [
        'Select FOLIO record type (disabled)',
        'Instance',
        'Holdings',
        'Item',
        'Order',
        'Invoice',
        'MARC Bibliographic',
        'MARC Holdings (disabled)',
        'MARC Authority',
      ],
      user: {},
    };

    before('Create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.dataImportSettingsPath,
        waiter: SettingsDataImport.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    describe('Settings', () => {
      it(
        'C365130 Verify Orders record type on creating new field mapping profile (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet'] },
        () => {
          // Go to Settings application-> Data import-> Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

          // Click Actions button, Select New field mapping profile
          const FieldMappingProfileEditForm =
            FieldMappingProfiles.clickCreateNewFieldMappingProfile();

          [
            { incomingRecordType: 'MARC Bibliographic', existingRecordType: 'Order' },
            { incomingRecordType: 'MARC Authority', existingRecordType: 'Order' },
            { incomingRecordType: 'EDIFACT invoice', existingRecordType: 'Order' },
          ].forEach(({ incomingRecordType, existingRecordType }) => {
            // In "Incoming record type" dropdown select option
            // In "Folio record type" dropdown list select option
            FieldMappingProfileEditForm.fillMappingProfileFields({
              summary: { name: testData.profileName, incomingRecordType, existingRecordType },
            });

            // Check the contents of the "FOLIO record type" dropdown list
            FieldMappingProfileEditForm.checkDropdownOptionsList({
              label: 'FOLIO record type',
              expectedList: testData.existingRecordTypes,
            });
          });

          // Click on "Close" button, Select "Close without saving"
          FieldMappingProfileEditForm.clickCloseButton();

          // Check changes from previous steps are not saved
          FieldMappingProfiles.searchByName(testData.profileName);
          FieldMappingProfiles.checkResultsPaneIsEmpty();
        },
      );
    });

    describe('Settings', () => {
      testData.mapping = FieldMappingProfiles.getDefaultMappingProfile();

      before('Create Field mapping profile', () => {
        cy.getAdminToken().then(() => {
          FieldMappingProfiles.createMappingProfileViaApi(testData.mapping);
        });
      });

      after('Delete Field mapping profile', () => {
        cy.getAdminToken().then(() => {
          FieldMappingProfiles.deleteMappingProfileViaApi(testData.mapping.profile.id);
        });
      });

      it(
        'C365131 Verify Orders record type on editing existing field mapping profile (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet'] },
        () => {
          // Go to Settings application-> Data import-> Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

          // Open field mapping profile view
          const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mapping.profile.name,
          });

          // Click Actions button, Select 'Edit' option
          const FieldMappingProfileEditForm = FieldMappingProfileView.clickEditButton();
          [
            { incomingRecordType: 'MARC Bibliographic', existingRecordType: 'Order' },
            { incomingRecordType: 'MARC Authority', existingRecordType: 'Order' },
            { incomingRecordType: 'EDIFACT invoice', existingRecordType: 'Order' },
          ].forEach(({ incomingRecordType, existingRecordType }) => {
            // In "Incoming record type" dropdown select option
            // In "Folio record type" dropdown list select option
            FieldMappingProfileEditForm.fillMappingProfileFields({
              summary: { name: testData.profileName, incomingRecordType, existingRecordType },
            });

            // Check the contents of the "FOLIO record type" dropdown list
            FieldMappingProfileEditForm.checkDropdownOptionsList({
              label: 'FOLIO record type',
              expectedList: testData.existingRecordTypes,
            });
          });

          // Click on "Close" button, Select "Close without saving"
          FieldMappingProfileEditForm.clickCloseButton();

          // Check changes from previous steps are not saved
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mapping.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'MARC Authority' } },
          ]);
        },
      );
    });
  });
});
