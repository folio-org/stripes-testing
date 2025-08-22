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
      instanceTitle: `AT_C552530_FolioInstance_${getRandomPostfix()}`,
      date1: '1$8 ',
      date2: '\\3 4',
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
      'C552530 Edit Instance without selected "Date type" and fields "Date 1" and "Date 2" filled by values with special characters (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552530'] },
      () => {
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();

        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(testData.date1, testData.date2, undefined);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();

        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.defaultDateType);
      },
    );
  });
});
