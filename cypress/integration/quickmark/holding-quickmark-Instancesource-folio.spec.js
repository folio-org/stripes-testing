/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewInventoryInstance from '../../support/fragments/inventory/newInventoryInstance';


describe('Manage holding records through quickmarc editor', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.add();
    NewInventoryInstance.fillRequiredValues();
  });
  it.only('C345406 FOLIO instance record + FOLIO holdings record (Regression)', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    // InventoryInstance.createHoldingsRecord();
    // InventoryInstance.goToHoldingView();
    // HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
    // // TODO: add verification of readonly fields - FAT-1135
    // HoldingsRecordView.tryToDelete();
    // HoldingsRecordView.duplicate();
    // NewHoldingsRecord.checkSource();
    // // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
  });
});
