/// <reference types="cypress" />

import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickmarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';

describe('Manage holding records with MARC source', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryActions.import();
    // TODO: redesign to api step
    InventorySteps.addMarcHoldingRecord();
  });
  it('C345409 MARC instance record + MARC holdings record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.holdingsRecord] }, () => {
    HoldingsRecordView.getId().then(initialHoldindsRecordId => {
      HoldingsRecordView.checkSource('MARC');
      HoldingsRecordView.checkActionsMenuOptionsInMarcSource();
      HoldingsRecordView.tryToDelete();
      HoldingsRecordView.viewSource();
      InventoryViewSource.close();
      HoldingsRecordView.editInQuickMarc();
      QuickmarcEditor.waitLoading();
      QuickmarcEditor.closeWithoutSaving();
      HoldingsRecordView.duplicate();
      InventoryNewHoldings.checkSource();
      InventoryNewHoldings.saveAndClose();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.getId().then(newHoldindsRecordId => {
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.checkAddItem(initialHoldindsRecordId);
        InventoryInstance.checkAddItem(newHoldindsRecordId);
      });
    });
  });
});
