// import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
// import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
// import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C396395 instance${getRandomPostfix()}`,
      statisticalCode: 'Book, print (books)',
      // secondStatisticalCode: 'Books, electronic (ebooks)',
      errorMessage: 'Please select to continue',
    };

    before('Create test data and login', () => {
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

    // after('Delete test data', () => {
    //   cy.getAdminToken().then(() => {
    //     InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
    //     Users.deleteViaApi(testData.user.userId);
    //   });
    // });

    it(
      'C396395 Verify the inability to save empty statistical code field on Instance create/edit page (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.clickAddStatisticalCode();
        InventoryNewInstance.fillInstanceFields({ title: testData.instanceTitle });
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryNewInstance.checkErrorMessageForStatisticalCode(true);
        InventoryNewInstance.chooseStatisticalCode(testData.statisticalCode);
        InventoryNewInstance.checkErrorMessageForStatisticalCode();
      },
    );
  });
});
