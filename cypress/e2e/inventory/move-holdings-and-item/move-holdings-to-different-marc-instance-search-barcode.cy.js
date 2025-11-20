import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C366105_MarcBibInstance_${randomPostfix}`;
    const barcodeOption = searchItemsOptions[1];
    const itemBarcode = `AT_C366105_ItemBarcode_${randomPostfix}`;

    let user;
    let location;
    let loanType;
    let materialType;
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C366105_MarcBibInstance');

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then((res) => {
          location = res;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
      })
        .then(() => {
          cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix} A`).then((instanceAId) => {
            instanceIds.push(instanceAId);
            cy.getInstanceById(instanceAId)
              .then((instanceAData) => {
                cy.createSimpleMarcHoldingsViaAPI(instanceAId, instanceAData.hrid, location.code);
              })
              .then((createdHoldingsId) => {
                cy.createItem({
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  holdingsRecordId: createdHoldingsId,
                  materialType: { id: materialType.id },
                  permanentLoanType: { id: loanType.id },
                  barcode: itemBarcode,
                });
              });

            cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix} B`).then((instanceBId) => {
              instanceIds.push(instanceBId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
            Permissions.uiInventoryHoldingsMove.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C366105 Verify that search by "Barcode" for "Item" which moved with "Holdings" (source = MARC) from one "Instance" to another will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C366105'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(instanceIds[0]);
        InventoryInstances.selectInstanceById(instanceIds[0]);
        InventoryInstance.waitLoading();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
          location.name,
          `${instanceTitlePrefix} B`,
        );
        InventoryInstancesMovement.checkHoldingsMoveSuccessCallout(1);
        InventoryInstancesMovement.verifyHoldingsMoved(location.name, '1');

        InventoryInstance.openHoldings(location.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemBarcode, location.name);

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(barcodeOption, itemBarcode);
        ItemRecordView.checkBarcode(itemBarcode);
        ItemRecordView.checkInstanceTitle(`${instanceTitlePrefix} B`);
      },
    );
  });
});
