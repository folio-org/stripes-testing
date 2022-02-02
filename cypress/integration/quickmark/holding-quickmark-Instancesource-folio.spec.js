/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewHoldingsRecord from '../../support/fragments/inventory/newHoldingsRecord';


describe('Manage holding records through quickmarc editor', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.add();
  });
  it('C345406 FOLIO instance record + FOLIO holdings record (Regression)', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.createHoldingsRecord();
    InventoryInstance.goToHoldingView();
    HoldingsRecordView.checkSource('FOLIO');
    HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
    // // TODO: add verification of readonly fields - FAT-1135
    HoldingsRecordView.tryToDelete();
    HoldingsRecordView.duplicate();
    NewHoldingsRecord.checkSource();
    // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
  });
});
