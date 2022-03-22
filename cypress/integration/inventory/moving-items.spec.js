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
import OrdersHelper from '../../support/fragments/orders/ordersHelper';

const successCalloutMessage = '1 item has been successfully moved.';


describe('inventory: moving items', () => {
  beforeEach('navigates to Inventory', () => {
    // TODO: replace this user with all permissions to user with only needed permission for moving items
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  // TODO: redesign test, add test data generation/delete
  it('C15185 Move multiple items from one holdings to another holdings within an instance', { tags: [TestTypes.smoke] }, () => {
    const secondHolding = 'Annex';

    InventorySearch.byEffectiveLocation();
    InventorySearch.selectSearchResultItem();
    InventoryInstance.openMoveItemsWithinAnInstance();

    InventoryInstance.moveItemToAnotherHolding(OrdersHelper.mainLibraryLocation, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);

    InventoryInstance.returnItemToFirstHolding(OrdersHelper.mainLibraryLocation, secondHolding);
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
