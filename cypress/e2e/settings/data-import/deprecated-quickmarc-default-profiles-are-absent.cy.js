import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      deprecatedJobProfiles: [
        'quickMARC - Create Holdings and SRS MARC Holdings',
        'quickMARC - Derive a new SRS MARC Bib and Instance',
      ],
      deprecatedActionProfiles: [
        'quickMARC Derive - Create Inventory Holdings',
        'quickMARC Derive - Create Inventory Instance',
      ],
      deprecatedMappingProfiles: [
        'quickMARC - Create MARC holdings and Inventory holdings',
        'quickMARC Derive - Create Inventory Instance',
      ],
    };

    const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];
    const capabsToAssign = [Capabilities.settingsEnabled];

    before('Create user and login', () => {
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          capabsToAssign,
          capabSetsToAssign,
        );
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: SettingsJobProfiles.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1453645 Deprecated quickMARC default profiles are absent from Data Import settings (promin)',
      { tags: ['criticalPath', 'promin', 'C1453645'] },
      () => {
        // Step 1: Job profiles list is displayed
        SettingsJobProfiles.waitLoading();

        // Step 2: Search for first deprecated job profile; verify absent
        SettingsJobProfiles.searchByName(testData.deprecatedJobProfiles[0]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();

        // Step 3: Search for second deprecated job profile; verify absent
        SettingsJobProfiles.clearSearchField();
        SettingsJobProfiles.checkResultsPaneIsEmpty({ isEmpty: false });
        SettingsJobProfiles.searchByName(testData.deprecatedJobProfiles[1]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();

        // Step 4: Navigate to Action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);

        // Step 5: Search for first deprecated action profile; verify absent
        SettingsActionProfiles.search(testData.deprecatedActionProfiles[0]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();

        // Step 6: Search for second deprecated action profile; verify absent
        SettingsJobProfiles.clearSearchField();
        SettingsJobProfiles.checkResultsPaneIsEmpty({ isEmpty: false });
        SettingsActionProfiles.search(testData.deprecatedActionProfiles[1]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();

        // Step 7: Navigate to Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Step 8: Search for first deprecated field mapping profile; verify absent
        SettingsFieldMappingProfiles.search(testData.deprecatedMappingProfiles[0]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();

        // Step 9: Search for second deprecated field mapping profile; verify absent
        SettingsJobProfiles.clearSearchField();
        SettingsJobProfiles.checkResultsPaneIsEmpty({ isEmpty: false });
        SettingsFieldMappingProfiles.search(testData.deprecatedMappingProfiles[1]);
        SettingsJobProfiles.checkResultsPaneIsEmpty();
      },
    );
  });
});
