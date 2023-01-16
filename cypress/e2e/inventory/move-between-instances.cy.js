import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemView from '../../support/fragments/inventory/inventoryItem/itemView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';


import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';

const successCalloutMessage = '1 holding has been successfully moved.';
let firstHolding = '';
let secondHolding = '';
let userId;
let source;
const item = {
    instanceName: `Inventory-first-${Number(new Date())}`,
    ITEM_BARCODE: `123${getRandomPostfix()}`,
};

const secondItem = {
    instanceName: `Inventory-second-${getRandomPostfix()}`,
    ITEM_BARCODE: `123${getRandomPostfix()}`,
};

describe('inventory', () => {
    before('create test data', () => {
        cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.uiInventoryMoveItems.gui,
            permissions.uiInventoryHoldingsMove.gui,
        ])
        .then(userProperties => {
            userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password);
            cy.visit(TopMenu.inventoryPath);
            cy.getAdminToken()
              .then(() => {
                cy.getLoanTypes({ limit: 1 });
                cy.getMaterialTypes({ limit: 1 });
                cy.getLocations({ limit: 2 });
                cy.getHoldingTypes({ limit: 2 });
                InventoryHoldings.getHoldingSources({ limit: 2 })
                  .then(holdingsSources => {
                    source = holdingsSources;
                  });
                cy.getInstanceTypes({ limit: 1 });
                ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
                cy.getUsers({
                  limit: 1,
                  query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
                });
              })
              .then(() => {
                firstHolding = Cypress.env('locations')[0].name;
                cy.createInstance({
                  instance: {
                    instanceTypeId: Cypress.env('instanceTypes')[0].id,
                    title: item.instanceName,
                  },
                  holdings: [
                    {
                      holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                      permanentLocationId: Cypress.env('locations')[0].id,
                      sourceId: source[0].id,
                    },
                    {
                      holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
                      permanentLocationId: Cypress.env('locations')[1].id,
                      sourceId: source[1].id,
                    }],
                  items: [
                    [{
                      barcode: item.ITEM_BARCODE,
                      missingPieces: '3',
                      numberOfMissingPieces: '3',
                      status: { name: 'Available' },
                      permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                      materialType: { id: Cypress.env('materialTypes')[0].id },
                    }],
                  ],
                });
              })
              .then(() => {
                InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.ITEM_BARCODE);
              });
          });
      });

    after('delete test data', () => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.ITEM_BARCODE);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.ITEM_BARCODE);
        Users.deleteViaApi(userId);
    })

    it('C15187 Move some items with in a holdings record to another holdings associated with another instance', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.ITEM_BARCODE)
        InventorySearchAndFilter.selectSearchResultItem();
        ItemView.closeDetailView();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(firstHolding, secondItem.instanceName);
        InteractorsTools.checkCalloutMessage(successCalloutMessage);
    });
})