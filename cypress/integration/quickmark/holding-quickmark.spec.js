/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import DataImport from '../../support/fragments/data_import/dataImport';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewHoldingsRecord from '../../support/fragments/inventory/newHoldingsRecord';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';

describe('Manage holding records through quickmarc editor', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C345390 Add a field to a record using quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    cy.visit(TopMenu.inventoryPath);
    // TODO: redesign to api step
    InventoryActions.import();
    // TODO: redesign to api step
    InventoryInstance.addMarcHoldingRecord();
    HoldingsRecordView.gotoEditInQuickMarc();

    // TODO: redesign to dynamic reading of rows count
    QuickMarcEditor.addRow(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    QuickMarcEditor.checkInitialContent(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor + 1);
    const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(undefined, undefined, HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    QuickMarcEditor.pressSaveAndClose();
    HoldingsRecordView.waitLoading();

    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
  });

  it('C345398 Add/Edit MARC 008', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    HoldingsRecordView.gotoEditInQuickMarc();
    QuickMarcEditor.checkInitial008TagValueFromHoldingsRecord();
    QuickMarcEditor.checkNotExpectedByteLabelsInHoldingsRecordTag008();

    const changed008TagValue = QuickMarcEditor.updateAllDefaultValuesIn008Tag();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(changed008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.gotoEditInQuickMarc();

    const cleared008TagValue = QuickMarcEditor.clearTag008();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(cleared008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.gotoEditInQuickMarc();
    QuickMarcEditor.checkReplacedVoidValuesInTag008();
  });

  it.only('C345408 MARC instance record + FOLIO holdings record (Regression)', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    DataImport.uploadMarcBib().then(instanceRecordHrId => {
      cy.visit(TopMenu.inventoryPath);
      SearchInventory.searchInstanceByHRID(instanceRecordHrId);
      InventoryInstances.selectSpecialInstance();
      InventoryInstance.waitLoading();
      InventoryInstance.createHoldingsRecord();
      InventoryInstance.goToHoldingView();
      //HoldingsRecordView.
    });
  });

});
