import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C566516 Auto ${getRandomPostfix()}`,
      updatedInstanceTitle: `C566516 Auto Updated ${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.instanceId);
              InventoryInstances.selectInstanceById(testData.instanceId);
            },
          );
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C566516 Edit Instance with empty "Date type" dropdown and empty "Date 1", "Date 2" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C566516'] },
      () => {
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();

        InstanceRecordEdit.fillResourceTitle(testData.updatedInstanceTitle);
        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();

        InstanceRecordView.verifyInstanceIsOpened(testData.updatedInstanceTitle);
        InstanceRecordView.verifyDates(undefined, undefined, undefined);
      },
    );
  });
});
