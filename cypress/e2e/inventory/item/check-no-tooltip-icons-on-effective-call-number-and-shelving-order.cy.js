import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C648457_FolioInstance_${randomPostfix}`,
      itemBarcode: generateItemBarcode(),
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((types) => {
            testData.instanceTypeId = types[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((types) => {
            testData.holdingTypeId = types[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            testData.locationId = res.id;
            testData.locationName = res.name;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((types) => {
            testData.loanTypeId = types[0].id;
          });
          cy.getDefaultMaterialType().then((mat) => {
            testData.materialTypeId = mat.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((source) => {
            testData.sourceId = source.id;
          });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
                sourceId: testData.sourceId,
              },
            ],
            items: [
              [
                {
                  barcode: testData.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  itemLevelCallNumber: testData.itemBarcode,
                },
              ],
            ],
          }).then((instanceId) => {
            testData.instanceId = instanceId;
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C648457 Check hover-over text next to "Effective call number" and "Shelving order" on the Item record detail view (promin)',
      { tags: ['extendedPath', 'promin', 'C648457'] },
      () => {
        // Step 1: Select Item tab
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        // Step 2: Select instance from precondition
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Click item barcode; verify no info icons next to Effective call number and Shelving order
        InventoryInstance.openHoldingsAccordion(`${testData.locationName} >`);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyCallNumber(testData.itemBarcode);
        ItemRecordView.verifyNoInfoIconsNextToCallNumberFields();
      },
    );
  });
});
