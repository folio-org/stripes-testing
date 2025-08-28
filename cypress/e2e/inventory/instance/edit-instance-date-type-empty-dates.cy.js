import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C552529_FolioInstance_${getRandomPostfix()}`,
      dateType: INSTANCE_DATE_TYPES.DETAILED,
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
      'C552529 Edit Instance with selected "Date type" and empty "Date 1" and "Date 2" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552529'] },
      () => {
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();

        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(undefined, undefined, testData.dateType);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();

        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(undefined, undefined, testData.dateType);
      },
    );
  });
});
