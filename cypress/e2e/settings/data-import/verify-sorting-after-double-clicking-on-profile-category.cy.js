import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import ResultsPane from '../../../support/fragments/settings/dataImport/resultsPane';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};

    before('Create user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C367995 Verify the sorting after double clicking on profile category (promin)',
      { tags: ['extendedPath', 'promin', 'C367995'] },
      () => {
        // Step 1: Field mapping profiles – list sorted alphabetically, URL has sort=name
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 2: Click "Field mapping profiles" nav item again – sort=name and order survive
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 3: Navigate to Action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.waitLoading();
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 4: Click "Action profiles" nav item again – sort=name and order survive
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.ACTION_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 5: Navigate to Match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.MATCH_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 6: Click "Match profiles" nav item again – sort=name and order survive
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.MATCH_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 7: Navigate to Job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.JOB_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();

        // Step 8: Click "Job profiles" nav item again – sort=name and order survive
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        SettingsPane.checkPaneIsOpened(SETTINGS_TABS.JOB_PROFILES);
        cy.url().should('include', 'sort=name');
        ResultsPane.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
