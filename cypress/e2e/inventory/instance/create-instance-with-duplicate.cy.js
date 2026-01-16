import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C380582 autoTestInstanceTitle${getRandomPostfix()}`,
      barcode: uuid(),
    };
    const instance = {
      title: `C380582 autoTestInstanceTitle${getRandomPostfix()}`,
      resourceType: 'other',
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.createInstanceViaApi(testData.instanceTitle, testData.barcode);
      });

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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
        Users.deleteViaApi(testData.user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((initialInstance) => {
          InventoryInstance.deleteInstanceViaApi(initialInstance.id);
        });
      });
    });

    it(
      'C380582 Create new instance with "Duplicate" (folijet)',
      { tags: ['extendedPath', 'folijet', 'C380582'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillRequiredValues(instance.title, instance.resourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InstanceRecordView.verifyInstanceIsOpened(instance.title);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
      },
    );
  });
});
