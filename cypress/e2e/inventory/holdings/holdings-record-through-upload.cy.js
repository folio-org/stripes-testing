/// <reference types="cypress" />

import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import testTypes from '../../../support/dictionary/testTypes';
import features from '../../../support/dictionary/features';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import DevTeams from '../../../support/dictionary/devTeams';

describe('Manage holding records of instance records created through marc file upload', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // required with special tests, but when step into test I see 403 some time in /metadata-provider/jobExecutions request
    cy.getAdminToken();
  });

  it(
    'C345408 MARC instance record + FOLIO holdings record (Regression) (spitfire)',
    { tags: [testTypes.smoke, DevTeams.spitfire, features.holdingsRecord, testTypes.broken] },
    () => {
      DataImport.uploadMarcBib().then((instanceRecordHrId) => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceRecordHrId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource('FOLIO');
        HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.checkReadOnlyFields();
        HoldingsRecordEdit.closeWithoutSave();
        HoldingsRecordView.checkReadOnlyFields();
        HoldingsRecordView.tryToDelete();
        HoldingsRecordView.duplicate();
        InventoryNewHoldings.checkSource();
        // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
      });
    },
  );
});
