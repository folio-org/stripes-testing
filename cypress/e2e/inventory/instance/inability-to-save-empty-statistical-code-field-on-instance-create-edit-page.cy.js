import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C396395 instance${getRandomPostfix()}`,
      statisticalCode: 'ARL (Collection stats):    books - Book, print (books)',
      editStatisticalCode: 'ARL (Collection stats):    ebooks - Books, electronic (ebooks)',
      errorMessage: 'Please select to continue',
    };

    before('Create test user and login', () => {
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
        Users.deleteViaApi(testData.user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"title"=="${testData.instanceTitle}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C396395 Verify the inability to save empty statistical code field on Instance create/edit page (folijet)',
      { tags: ['extendedPath', 'folijet', 'C396395'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.clickAddStatisticalCodeButton();
        InventoryNewInstance.fillInstanceFields({ title: testData.instanceTitle });
        InventoryNewInstance.clickSaveCloseButton();
        InventoryNewInstance.checkErrorMessageForStatisticalCode(true);
        InventoryNewInstance.chooseStatisticalCode(testData.statisticalCode);
        InventoryNewInstance.checkErrorMessageForStatisticalCode();
        InventoryNewInstance.deleteStatisticalCode(testData.statisticalCode);
        InventoryNewInstance.clickAddStatisticalCodeButton();
        InventoryNewInstance.clickSaveCloseButton();
        InventoryNewInstance.checkErrorMessageForStatisticalCode(true);
        InventoryNewInstance.chooseStatisticalCode(testData.statisticalCode);
        InventoryNewInstance.checkErrorMessageForStatisticalCode();
        InventoryNewInstance.clickSaveAndCloseButton();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);

        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.deleteStatisticalCode(testData.statisticalCode);
        InstanceRecordEdit.clickAddStatisticalCodeButton();
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyErrorMessageForStatisticalCode(true);
        InstanceRecordEdit.chooseStatisticalCode(testData.editStatisticalCode);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifySuccsessCalloutMessage();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
      },
    );
  });
});
