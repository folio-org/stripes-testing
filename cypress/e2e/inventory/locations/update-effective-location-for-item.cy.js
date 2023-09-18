import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import GenerateItemBarcode from '../../../support/utils/generateItemBarcode';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Helper from '../../../support/fragments/finance/financeHelper';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('inventory', () => {
  describe('Cataloging', () => {
    const itemData = {
      instanceTitle: `autoTestInstanceTitle ${Helper.getRandomBarcode()}`,
      itemBarcode: GenerateItemBarcode(),
    };
    const anotherPermanentLocation = 'Main Library';
    let testInstanceId;
    let instanceHrid;
    let user;

    before(() => {
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.remoteStorageView.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.searchByParameter(
            'Keyword (title, contributor, identifier, HRID, UUID)',
            itemData.instanceTitle,
          );
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrid = initialInstanceHrId;
          });
          InventorySearchAndFilter.resetAll();
        },
      );
    });

    afterEach(() => {
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

    it(
      'C3501 An item is being moved from one library location to another. Update the effective location for the item (folijet) (prokopovych)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventoryInstance.waitInstanceRecordViewOpened(itemData.instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.changePermanentLocation(anotherPermanentLocation);
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.close();
        InventoryInstance.openHoldings([anotherPermanentLocation]);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', itemData.itemBarcode);
        ItemRecordView.verifyEffectiveLocation(anotherPermanentLocation);
      },
    );
  });
});
