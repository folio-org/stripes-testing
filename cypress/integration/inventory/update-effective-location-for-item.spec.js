import TestTypes from '../../support/dictionary/testTypes';
import HoldingsRecordEdit from '../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';

describe('Update the effective location for the item', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const anotherPermanentLocation = 'Main Library';
  const ITEM_BARCODE = generateItemBarcode();
  let userId = '';

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
          cy.getLocations({ limit: 1 });
          cy.getHoldingTypes({ limit: 1 });
          cy.getHoldingSources({ limit: 1 });
        })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
                source: 'FOLIO',
              },
              holdings: [{
                permanentLocationId: Cypress.env('locations')[0].id,
              }],
              items: [
                [{
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          });
        cy.login(userProperties.username, userProperties.password);
      });
    cy.visit(TopMenu.inventoryPath);
  });

  afterEach(() => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteUser(userId);
  });

  it('C3501 An item is being moved from one library location to another. Update the effective location for the item',
    { tags: [TestTypes.smoke] },
    () => {
      InventorySearch.switchToItem();
      InventorySearch.searchByParameter('Barcode', ITEM_BARCODE);
      InventorySearch.selectSearchResultItem();
      InventoryInstance.goToHoldingView();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.changePermanentLocation(anotherPermanentLocation);
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkPermanentLocation(anotherPermanentLocation);
      HoldingsRecordView.close();
      InventoryInstance.openHoldings([anotherPermanentLocation]);
      InventoryInstance.openItemView(ITEM_BARCODE);
      ItemRecordView.verifyPermanentLocation(anotherPermanentLocation);
    });
});
