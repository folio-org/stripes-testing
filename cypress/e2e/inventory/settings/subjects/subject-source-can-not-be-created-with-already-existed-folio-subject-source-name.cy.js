import { APPLICATION_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import SubjectSources from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Subjects', () => {
      const testData = {
        user: {},
        subjectSourceName: 'Canadian Subject Headings',
        errorMessage: 'Error saving data. Name must be unique.',
      };

      before('Create test data and login', () => {
        cy.createTempUser([Permissions.uiSettingsSubjectSourceCreateEditDelete.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.waitLoading();
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        "C543860 Check that Subject source can't be created with already existed folio subject source name (folijet)",
        { tags: ['extendedPath', 'folijet', 'C543860'] },
        () => {
          SubjectSources.create(testData.subjectSourceName);
          SubjectSources.validateNameFieldWithError(testData.errorMessage);
        },
      );
    });
  });
});
