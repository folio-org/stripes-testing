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
      instanceTitle: `C552528 Auto ${getRandomPostfix()}`,
      date1: '0981',
      dateType: INSTANCE_DATE_TYPES.QUESTIONABLE,
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
      'C552528 Edit Instance with selected "Date type" and field "Date 1" filled only (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552528'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(testData.date1, undefined, testData.dateType);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(testData.date1, undefined, testData.dateType);
      },
    );
  });
});
