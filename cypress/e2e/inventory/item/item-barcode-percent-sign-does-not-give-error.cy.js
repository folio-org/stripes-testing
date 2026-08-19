import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instance: {
        title: `AT_C1045418_FolioInstance_${randomPostfix}`,
      },
      item: {
        barcode: '%',
        materialType: null,
        loanType: null,
      },
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1045418_');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
          testData.holdingsSourceId = source.id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.item.loanType = res[0].name;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.item.materialType = res.name;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instance.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.location.id,
              sourceId: testData.holdingsSourceId,
            },
          ],
          items: [],
        }).then((createdInstance) => {
          testData.instance.id = createdInstance.instanceId;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1045418 Item barcode does not gives error when user enter "%" in barcode (promin)',
      { tags: ['criticalPath', 'promin', 'C1045418'] },
      () => {
        // Step 1: Open instance and click "Add item" near Holding accordion
        InventoryInstances.searchByTitle(testData.instance.id);
        InventoryInstances.selectInstanceById(testData.instance.id);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.addItem();

        // Step 2: Fill Material type, Permanent loan type, Barcode = "%" and save
        ItemRecordNew.fillItemRecordFields({
          materialType: testData.item.materialType,
          loanType: testData.item.loanType,
          barcode: testData.item.barcode,
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });

        // Verify: item saved with barcode "%" - no errors
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.checkIsItemCreated(testData.item.barcode);
      },
    );
  });
});
