import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import SubjectTypes, {
  ACTION_BUTTONS,
} from '../../../../support/fragments/settings/inventory/instances/subjectTypes';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Subjects', () => {
      const testData = {
        source: 'local',
        name: `AT_C543781_SubjectType${getRandomPostfix()}`,
        heading: `AT_C543781_SubjectHeading${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          SubjectTypes.createViaApi({
            source: testData.source,
            name: testData.name,
          }).then((response) => {
            testData.subjectTypeId = response.body.id;

            cy.getInstanceById(testData.instance.instanceId).then((body) => {
              body.subjects = [
                {
                  value: testData.heading,
                  typeId: response.body.id,
                },
              ];
              cy.updateInstance(body);
            });
          });
        });
        cy.getAdminUserDetails().then((user) => {
          testData.adminLastName = user.personal.lastName;
        });
        cy.createTempUser([Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password);
          },
        );
      });

      after('Delete user', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SubjectTypes.deleteViaApi(testData.subjectTypeId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C543781 Check the "Delete" action in "Settings (Inventory): Create, edit, delete subject types" permission for linked to Instance subject type (folijet)',
        { tags: ['extendedPath', 'folijet', 'C543781'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
          SubjectTypes.waitLoading();
          SubjectTypes.verifySubjectTypeExists({
            name: testData.name,
            source: testData.source,
            user: testData.adminLastName,
            actions: [ACTION_BUTTONS.EDIT, ACTION_BUTTONS.TRASH],
          });
          SubjectTypes.deleteSubjectType(testData.name);
          SubjectTypes.confirmDeletionOfSubjectType(testData.name);
          SubjectTypes.verifySubjectTypeCannotBeDeleted();
          SubjectTypes.waitLoading();
          SubjectTypes.verifySubjectTypeExists({
            name: testData.name,
            source: testData.source,
            user: testData.adminLastName,
            actions: [ACTION_BUTTONS.EDIT, ACTION_BUTTONS.TRASH],
          });
        },
      );
    });
  });
});
