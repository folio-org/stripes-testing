/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import NewHoldingsRecord from '../../support/fragments/inventory/newHoldingsRecord';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import QuickmarcEditor from '../../support/fragments/quickMarcEditor';


describe('Manage holding records with MARC source', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryActions.import();
    // TODO: redesign to api step
    InventorySteps.addMarcHoldingRecord();
  });
  it('C345409 MARC instance record + MARC holdings record', { tags: [TestTypes.smoke, Features.holdingsRecord] }, () => {
    HoldingsRecordView.checkSource('MARC');
    HoldingsRecordView.checkActionsMenuOptionsInMarcSource();
    HoldingsRecordView.tryToDelete();
    // TODO: Able to view Source for MARC holdings record
    HoldingsRecordView.viewSource();
    InventoryViewSource.close();
    HoldingsRecordView.gotoEditInQuickMarc();
    QuickmarcEditor.waitLoading();
    QuickmarcEditor.closeWithoutSaving();
    HoldingsRecordView.duplicate();
    NewHoldingsRecord.checkSource();
    cy.pause();
    // TODO: Able to add item
  });
});
