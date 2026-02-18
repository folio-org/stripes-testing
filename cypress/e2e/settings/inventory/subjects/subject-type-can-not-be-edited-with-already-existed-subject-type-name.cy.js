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
      const firstLocalSubjectType = {
        name: `C543865 autotestSubjectTypeName${getRandomPostfix()}`,
        source: 'local',
      };
      const secondLocalSubjectType = {
        name: `C543865 autotestSubjectTypeName${getRandomPostfix()}`,
        source: 'local',
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.getAdminUserDetails().then((admin) => {
          testData.adminUser = admin;
        });
        SubjectTypes.createViaApi({
          source: firstLocalSubjectType.source,
          name: firstLocalSubjectType.name,
        }).then((response) => {
          firstLocalSubjectType.id = response.body.id;
        });
        SubjectTypes.createViaApi({
          source: secondLocalSubjectType.source,
          name: secondLocalSubjectType.name,
        }).then((response) => {
          secondLocalSubjectType.id = response.body.id;
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
        SubjectTypes.deleteViaApi(firstLocalSubjectType.id);
        SubjectTypes.deleteViaApi(secondLocalSubjectType.id);
      });

      it(
        "C543865 Check that Subject type can't be edited with already existed subject type name (folijet)",
        { tags: ['extendedPath', 'folijet', 'C543865'] },
        () => {
          SubjectTypes.verifySubjectTypeExists({
            name: firstLocalSubjectType.name,
            source: firstLocalSubjectType.source,
            user: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
            actions: ['edit', 'trash'],
          });
          SubjectTypes.editSubjectTypeName(firstLocalSubjectType.name, secondLocalSubjectType.name);
          SubjectTypes.validateNameFieldWithError(testData.errorMessage);
        },
      );
    });
  });
});
