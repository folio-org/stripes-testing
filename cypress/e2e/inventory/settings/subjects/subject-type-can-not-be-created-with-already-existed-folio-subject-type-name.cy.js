import { APPLICATION_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import SubjectTypes from '../../../../support/fragments/settings/inventory/instances/subjectTypes';
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
        subjectTypeName: 'Chronological term',
        errorMessage: 'Error saving data. Name must be unique.',
      };

      before('Create test data and login', () => {
        cy.createTempUser([Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.waitLoading();
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        "C543862 Check that Subject type can't be created with already existed folio subject type name name (folijet)",
        { tags: ['extendedPath', 'folijet', 'C543862'] },
        () => {
          SubjectTypes.createSubjectType(testData.subjectTypeName);
          SubjectTypes.validateNameFieldWithError(testData.errorMessage);
        },
      );
    });
  });
});
