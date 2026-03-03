import { APPLICATION_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import SubjectTypes from '../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Subjects', () => {
      const testData = {
        user: {},
        errorMessage: 'Error saving data. Name must be unique.',
      };
      const localSubjectType = {
        name: `C543863 autotestSubjectTypeName${getRandomPostfix()}`,
        source: 'local',
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        SubjectTypes.createViaApi({
          source: localSubjectType.source,
          name: localSubjectType.name,
        }).then((response) => {
          localSubjectType.id = response.body.id;
        });

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
        SubjectTypes.deleteViaApi(localSubjectType.id);
      });

      it(
        "C543863 Check that Subject type can't be created with already existed local subject type name (folijet)",
        { tags: ['extendedPath', 'folijet', 'C543863'] },
        () => {
          SubjectTypes.createSubjectType(localSubjectType.name);
          SubjectTypes.validateNameFieldWithError(testData.errorMessage);
        },
      );
    });
  });
});
