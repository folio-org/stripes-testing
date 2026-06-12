import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      instanceTitle: `AT_C466124_FolioInstance_${getRandomPostfix()}`,
      holdingsLocation: LOCATION_NAMES.ANNEX_UI,
      itemBarcode: generateItemBarcode(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            testData.instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.holdingsLocation}"` }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.sourceId = folioSource.id;
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
                },
              ],
            ],
          }).then((instanceId) => {
            testData.instanceId = instanceId;
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryMarcItemRestricted.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C466124 Verify status of restricted item (folijet)',
      { tags: ['extendedPath', 'folijet', 'C466124'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(`${testData.holdingsLocation} >`);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.markItemAsRestricted();
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.RESTRICTED);
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.RESTRICTED);
      },
    );
  });
});
