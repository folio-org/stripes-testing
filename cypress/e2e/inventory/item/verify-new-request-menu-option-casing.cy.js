import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C399089_FolioInstance_${randomPostfix}`,
      itemBarcode: `at_c399089_${randomPostfix}`,
      requestOption: 'New request',
    };
    let testUser;

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        testData.instanceId = InventoryInstances.createInstanceViaApi(
          testData.instanceTitle,
          testData.itemBarcode,
        );
      });
      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiRequestsAll.gui]).then(
        (userProperties) => {
          testUser = userProperties;
          cy.login(testUser.username, testUser.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser?.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C399089 Verify the menu option for creating requests on Item detail page (promin)',
      { tags: ['extendedPath', 'promin', 'C399089'] },
      () => {
        // Step 1: Find instance, open item detail page
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion('Holdings: ');
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();

        // Step 2: Click Actions, verify "New request" has correct casing (capital N, lowercase r)
        ItemRecordView.validateOptionInActionsMenu({
          optionName: testData.requestOption,
          shouldExist: true,
        });
      },
    );
  });
});
