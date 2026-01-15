import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Helper from '../../../../support/fragments/finance/financeHelper';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import GenerateItemBarcode from '../../../../support/utils/generateItemBarcode';

describe('Inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    const itemData = {
      instanceTitle: `AT_C3501_Instance_${Helper.getRandomBarcode()}`,
      itemBarcode: GenerateItemBarcode(),
    };
    const anotherPermanentLocation = 'Main Library';
    let testInstanceId;
    let instanceHrid;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: 'name="Online"' }).then((res) => {
            itemData.locationId = res.id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: itemData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: itemData.locationId,
              },
            ],
            items: [
              {
                barcode: itemData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanTypeId },
                materialType: { id: itemData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testInstanceId = specialInstanceIds;

            cy.getInstanceById(specialInstanceIds.instanceId).then((res) => {
              instanceHrid = res.hrid;
            });
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.remoteStorageView.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.wrap(
          testInstanceId.holdingIds.forEach((holdingsId) => {
            cy.wrap(
              holdingsId.itemIds.forEach((itemId) => {
                cy.deleteItemViaApi(itemId);
              }),
            ).then(() => {
              cy.deleteHoldingRecordViaApi(holdingsId.id);
            });
          }),
        ).then(() => {
          InventoryInstance.deleteInstanceViaApi(testInstanceId.instanceId);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C3501 An item is being moved from one library location to another. Update the effective location for the item (folijet)',
      { tags: ['smoke', 'folijet', 'C3501', 'shiftLeft'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventoryInstance.waitInstanceRecordViewOpened(itemData.instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.changePermanentLocation(anotherPermanentLocation);
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.close();
        cy.wait(1000);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', itemData.itemBarcode);
        ItemRecordView.verifyEffectiveLocation(anotherPermanentLocation);
      },
    );
  });
});
