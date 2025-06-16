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
      instanceTitle: `C552504 Auto ${getRandomPostfix()}`,
      date1: '1881',
      date2: '2011',
      dateType: INSTANCE_DATE_TYPES.BC,
    };

    before('Login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.getInstanceIdApi({
          limit: 1,
          query: `title="${testData.instanceTitle}"`,
        }).then((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C552504 Create Instance with selected Date type and fields Date 1, Date 2 filled by digits (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552504'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
        InstanceRecordEdit.verifyDateFieldsPresent();
        InstanceRecordEdit.verifyDateTypeOptions();
        InstanceRecordEdit.verifyDateTypePlaceholderOptionSelected();
        InstanceRecordEdit.fillDates(testData.date1, testData.date2, testData.dateType);
        InstanceRecordEdit.saveAndClose();
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.dateType);
      },
    );
  });
});
