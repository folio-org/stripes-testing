import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C397328_FolioInstance_${randomPostfix}`,
      itemBarcode: `at_c397328_${randomPostfix}`,
    };
    let testUser;

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        testData.instanceId = InventoryInstances.createInstanceViaApi(
          testData.instanceTitle,
          testData.itemBarcode,
        );
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testUser = userProperties;
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser?.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C397328 Verify that no error appears after switch from Item Edit screen to another app and back (promin)',
      { tags: ['extendedPath', 'promin', 'C397328'] },
      () => {
        // Step 1: Find instance, open item, navigate to Edit page
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion('Holdings: ');
        InventoryInstance.openItemByBarcodeAndIndex(testData.itemBarcode, 0);
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // Step 2: Navigate to Data Import app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();

        // Step 3: Return to Inventory — no error, Edit page is re-opened
        TopMenu.openInventoryApp();
        cy.wait(3000); // make sure error page has enough time to load if it is going to load
        InteractorsTools.checkNoErrorCallouts();
        ItemRecordEdit.waitLoading(testData.instanceTitle);
      },
    );
  });
});
