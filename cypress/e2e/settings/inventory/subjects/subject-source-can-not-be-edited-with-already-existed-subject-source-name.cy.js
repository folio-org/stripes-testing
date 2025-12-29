import { APPLICATION_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import SubjectSources from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Subjects', () => {
      const testData = {
        user: {},
        errorMessage: 'Error saving data. Name must be unique.',
      };
      const firstLocalSubjectSource = {
        name: `C543864 autotestSubjectSourceName${getRandomPostfix()}`,
        source: 'local',
      };
      const secondLocalSubjectSource = {
        name: `C543864 autotestSubjectSourceName${getRandomPostfix()}`,
        source: 'local',
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        SubjectSources.createViaApi({
          source: firstLocalSubjectSource.source,
          name: firstLocalSubjectSource.name,
        }).then((response) => {
          firstLocalSubjectSource.id = response.body.id;
        });
        SubjectSources.createViaApi({
          source: secondLocalSubjectSource.source,
          name: secondLocalSubjectSource.name,
        }).then((response) => {
          secondLocalSubjectSource.id = response.body.id;
        });

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

      // after('Delete test data', () => {
      //   cy.getAdminToken();
      //   Users.deleteViaApi(testData.user.userId);
      //   SubjectSources.deleteViaApi(localSubjectSource.id);
      // });

      it(
        "C543864 Check that Subject source can't be edited with already existed subject source name (folijet)",
        { tags: ['extendedPath', 'folijet', 'C543864'] },
        () => {
          SubjectSources.editSubjectSourceName(
            firstLocalSubjectSource.name,
            secondLocalSubjectSource.name,
          );
          SubjectSources.validateButtonsState({ cancel: 'enabled', save: 'disabled' });
          SubjectSources.validateNameFieldWithError(testData.errorMessage);
        },
      );
    });
  });
});
