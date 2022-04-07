import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import TestTypes from '../../support/dictionary/testTypes';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';

const successCalloutMessage = '1 item has been successfully moved.';
let userId = '';
let firstHolding = '';
let secondHolding = '';
const ITEM_BARCODE = `test${getRandomPostfix()}`;

describe('ui-inventory: moving items', () => {
  beforeEach('navigates to Inventory', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiInventoryMoveItems.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(TopMenu.inventoryPath);
        cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 2 });
            cy.getHoldingSources({ limit: 2 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            firstHolding = Cypress.env('locations')[0].name;
            secondHolding = Cypress.env('locations')[1].name;
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: Cypress.env('locations')[0].id,
                  sourceId: Cypress.env('holdingSources')[0].id,
                },
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
                  permanentLocationId: Cypress.env('locations')[1].id,
                  sourceId: Cypress.env('holdingSources')[1].id,
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
      });
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then(() => {
        cy.deleteItem(Cypress.env('instances')[0].items[0].id);
        cy.deleteHoldingRecord(Cypress.env('instances')[0].holdings[0].id);
        cy.deleteHoldingRecord(Cypress.env('instances')[0].holdings[1].id);
        cy.deleteInstanceApi(Cypress.env('instances')[0].id);
      });
    cy.deleteUser(userId);
  });


  it('C15185 Move multiple items from one holdings to another holdings within an instance', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.switchToItem();
    InventorySearch.searchByParameter('Barcode', ITEM_BARCODE);
    InventorySearch.selectSearchResultItem();
    InventoryInstance.openMoveItemsWithinAnInstance();

    InventoryInstance.moveItemToAnotherHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);

    InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);
  });

  // TODO: https://issues.folio.org/browse/UIIN-1963
  it('C345404 Move holdings record with Source = MARC to an instance record with source = MARC', { tags:  [TestTypes.smoke, Features.eHoldings] }, () => {
    InventoryActions.import();
    InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
      // additional instance record which will linked with holdings record initially
      InventoryActions.import();
      // TODO: redesign to api step
      InventorySteps.addMarcHoldingRecord();
      HoldingsRecordView.getHoldingsHrId().then(holdingsRecordhrId => {
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        // TODO: issue with moving presented, see UIIN-1929, related with fail ath the end of test execution
        InventoryInstance.moveHoldingsToAnotherInstance(initialInstanceHrId);
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.searchByParameter('Instance HRID', initialInstanceHrId);
        InventoryInstances.waitLoading();
        InventoryInstances.selectInstance();
        InventoryInstance.goToHoldingView();
        HoldingsRecordView.checkHrId(holdingsRecordhrId);
        HoldingsRecordView.viewSource();
        // TODO: recheck after fix of UIIN-1929
        InventoryViewSource.contains(`004\t${initialInstanceHrId}`);
      });
    });
  });
});

