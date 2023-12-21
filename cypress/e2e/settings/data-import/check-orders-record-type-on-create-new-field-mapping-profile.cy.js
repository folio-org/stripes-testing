import { Permissions } from '../../../support/dictionary';
import {
  SettingsDataImport,
  FieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      profileName: `autotest_profile_name_${getRandomPostfix()}`,
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

    before('Create test data', () => {
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
      'C365130 Verify Orders record type on creating new field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

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
            name: testData.profileName,
            incomingRecordType,
            existingRecordType,
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
});
