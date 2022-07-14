import TestTypes from '../../../support/dictionary/testTypes';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import ItemRecordView from '../../../support/fragments/inventory/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Helper from '../../../support/fragments/finance/financeHelper';

describe('ui-inventory: Update the effective location for the item', () => {
  const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
  const anotherPermanentLocation = 'Main Library';
  const itemBarcode = generateItemBarcode();
  let userId;
  let testInstanceIds;

  beforeEach(() => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.getAdminToken().then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getInstanceTypes({ limit: 1 });
          cy.getLocations({ limit: 1, query: 'name="Online"' });
          cy.getHoldingTypes({ limit: 1 });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
              }],
              items: [
                {
                  barcode: itemBarcode,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
            })
              .then(specialInstanceIds => {
                testInstanceIds = specialInstanceIds;
              });
          });
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
  });

  afterEach(() => {
    cy.wrap(testInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(testInstanceIds.instanceId);
    });
    Users.deleteViaApi(userId);
  });

  it('C3501 An item is being moved from one library location to another. Update the effective location for the item (folijet)',
    { tags: [TestTypes.smoke] },
    () => {
      InventorySearch.switchToItem();
      InventorySearch.searchByParameter('Barcode', itemBarcode);
      InventorySearch.selectSearchResultItem();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.changePermanentLocation(anotherPermanentLocation);
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkPermanentLocation(anotherPermanentLocation);
      HoldingsRecordView.close();
      InventoryInstance.openHoldings([anotherPermanentLocation]);
      InventoryInstance.openItemView(itemBarcode);
      ItemRecordView.verifyPermanentLocation(anotherPermanentLocation);
    });
});
