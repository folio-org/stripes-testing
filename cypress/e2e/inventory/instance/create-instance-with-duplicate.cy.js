import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C380582 autoTestInstanceTitle${getRandomPostfix()}`,
      barcode: uuid(),
    };
    const instance = {
      title: `C380582 autoTestInstanceTitle${getRandomPostfix()}`,
      resourceType: 'other',
    };

    before('create user and login', () => {
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

    after(() => {
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
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillRequiredValues(instance.title, instance.resourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InstanceRecordView.verifyIsInstanceOpened(instance.title);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
      },
    );
  });
});
