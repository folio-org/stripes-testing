import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import { calloutTypes } from '../../../interactors';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';
import Z3950TargetProfiles from '../../support/fragments/settings/inventory/z39.50TargetProfiles';

describe('Manage holding records through quickmarc editor', () => {
  const quickmarcEditor = new QuickMarcEditor(InventoryInstance.validOCLC);

  before(() => {
    cy.getAdminToken().then(() => {
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
    });
  });

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    // TODO: redesign to api step
    InventoryActions.import();
    // TODO: redesign to api step
    InventorySteps.addMarcHoldingRecord();
    // TODO: https://issues.folio.org/browse/UIIN-2044
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.waitLoading();
  });
  
  it('C345390 Add a field to a record using quickMARC (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.quickMarcEditor] }, () => {
    // TODO: redesign to dynamic reading of rows count
    quickmarcEditor.addRow(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    quickmarcEditor.checkInitialContent(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor + 1);
    const expectedInSourceRow = quickmarcEditor.fillAllAvailableValues(undefined, undefined, HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
    QuickMarcEditor.pressSaveAndClose();
    HoldingsRecordView.waitLoading();

    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
  });

  it('C345398 Add/Edit MARC 008 (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.quickMarcEditor] }, () => {
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

  it('C345400 Attempt to save a record without a MARC 852 (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.quickMarcEditor] }, () => {
    QuickMarcEditor.getRegularTagContent('852')
      .then(initialTagContent => {
        QuickMarcEditor.deleteTag('852');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.confirmDelete();
        InteractorsTools.checkCalloutMessage('Record cannot be saved. An 852 is required.', calloutTypes.error);
        QuickMarcEditor.closeWithoutSaving();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(QuickMarcEditor.getSourceContent(initialTagContent));
      });
  });
});
