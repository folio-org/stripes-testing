import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
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
      instanceTitle: `AT_C692067_FolioInstance_${randomPostfix}`,
      user: {},
    };

    before('Create test data, login, open instance', () => {
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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      "C692067 Check that barcode don't have copy icon when it's empty (promin)",
      { tags: ['extendedPath', 'promin', 'C692067'] },
      () => {
        // Step 1: Open instance details, expand Holdings accordion; verify no copy icon next to barcode
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingsAccordion(`${testData.locationName} >`);
        InventoryInstance.verifyNoCopyIconForItemInHoldings(testData.locationName);

        // Step 2: Click barcode hyperlink; verify item details page opened and no barcode was copied
        InventoryInstance.openHoldingItem({ name: testData.locationName, shouldOpen: false });
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemBarcode();
      },
    );
  });
});
