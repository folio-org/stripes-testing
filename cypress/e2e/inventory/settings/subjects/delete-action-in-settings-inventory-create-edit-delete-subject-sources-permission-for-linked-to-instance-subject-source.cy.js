import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import SubjectSources, {
  ACTION_BUTTONS,
} from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Subjects', () => {
      const testData = {
        source: 'local',
        name: `AT_C543780_SubjectSource${getRandomPostfix()}`,
        heading: `AT_C543780_SubjectHeading${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          SubjectSources.createViaApi({
            source: testData.source,
            name: testData.name,
          }).then((response) => {
            testData.subjectSourceId = response.body.id;

            cy.getInstanceById(testData.instance.instanceId).then((body) => {
              body.subjects = [
                {
                  authorityId: null,
                  value: testData.heading,
                  sourceId: response.body.id,
                  typeId: null,
                },
              ];
              cy.updateInstance(body);
            });
          });
        });
        cy.getAdminUserDetails().then((user) => {
          testData.adminLastName = user.personal.lastName;
        });
        cy.createTempUser([Permissions.uiSettingsSubjectSourceCreateEditDelete.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password);
          },
        );
      });

      after('Delete user', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SubjectSources.deleteViaApi(testData.subjectSourceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C543780 Check the "Delete" action in "Settings (Inventory): Create, edit, delete subject sources" permission for linked to Instance subject source (folijet)',
        { tags: ['extendedPath', 'folijet', 'C543780'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
          SubjectSources.waitLoading();
          SubjectSources.verifySubjectSourceExists(
            testData.name,
            testData.source,
            testData.adminLastName,
            { actions: [ACTION_BUTTONS.EDIT, ACTION_BUTTONS.TRASH] },
          );
          SubjectSources.deleteSubjectSource(testData.name);
          SubjectSources.confirmDeletionOfSubjectSource(testData.name);
          SubjectSources.verifySubjectSourceCannotBeDeleted();
          SubjectSources.verifySubjectSourceExists(
            testData.name,
            testData.source,
            testData.adminLastName,
            { actions: [ACTION_BUTTONS.EDIT, ACTION_BUTTONS.TRASH] },
          );
        },
      );
    });
  });
});
