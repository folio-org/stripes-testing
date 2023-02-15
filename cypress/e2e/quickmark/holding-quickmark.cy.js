import TopMenu from '../../support/fragments/topMenu';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import TestTypes from '../../support/dictionary/testTypes';
import { calloutTypes } from '../../../interactors';
import InteractorsTools from '../../support/utils/interactorsTools';
import DevTeams from '../../support/dictionary/devTeams';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import Users from '../../support/fragments/users/users';

describe('Manage holding records through quickmarc editor', () => {
  const testData = {};
  let instanceID;

  before(() => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
      ]).then(userProperties => {
        testData.user = userProperties;

        cy.loginAsAdmin();
        DataImport.uploadMarcBib();

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchBySource('MARC');
        InventoryInstances.selectInstance();
        InventoryInstance.getId().then(id => { instanceID = id; });
        InventorySteps.addMarcHoldingRecord();
      });
    });
  });

  beforeEach(() => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchInstanceByTitle(instanceID);
    InventorySearchAndFilter.selectViewHoldings();
    HoldingsRecordView.editInQuickMarc();
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchInstanceByTitle(instanceID);
    InventorySearchAndFilter.selectViewHoldings();
    HoldingsRecordView.delete();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(instanceID);
  });

  it('C345390 Add a field to a record using quickMARC (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    QuickMarcEditor.addRow(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    QuickMarcEditor.checkInitialContent(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor + 1);
    const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(undefined, undefined, HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    QuickMarcEditor.pressSaveAndClose();
    HoldingsRecordView.waitLoading();

    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
  });

  it('C345398 Add/Edit MARC 008 (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    QuickMarcEditor.checkInitial008TagValueFromHoldings();
    QuickMarcEditor.checkNotExpectedByteLabelsInTag008Holdings();

    const changed008TagValue = QuickMarcEditor.updateAllDefaultValuesIn008TagInHoldings();
    HoldingsRecordView.waitLoading();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(changed008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.waitLoading();

    const cleared008TagValue = QuickMarcEditor.clearTag008Holdings();
    HoldingsRecordView.waitLoading();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(cleared008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkReplacedVoidValuesInTag008Holdings();
  });

  it('C345400 Attempt to save a record without a MARC 852 (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    QuickMarcEditor.getRegularTagContent('852')
      .then(initialTagContent => {
        QuickMarcEditor.deleteTag(5);
        QuickMarcEditor.pressSaveAndClose();
        InteractorsTools.checkCalloutMessage('Record cannot be saved. An 852 is required.', calloutTypes.error);
        QuickMarcEditor.closeWithoutSavingAfterChange();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(QuickMarcEditor.getSourceContent(initialTagContent));
      });
  });
});
