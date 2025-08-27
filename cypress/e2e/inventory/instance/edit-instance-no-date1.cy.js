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
      instanceTitle: `C552532 Auto ${getRandomPostfix()}`,
      date2: '19_9',
      defaultDateType: INSTANCE_DATE_TYPES.NO,
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
      'C552532 Edit Instance without selected "Date type" and field "Date 2" filled only (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552532'] },
      () => {
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();

        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(undefined, testData.date2, undefined);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();

        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(undefined, testData.date2, testData.defaultDateType);
      },
    );
  });
});
