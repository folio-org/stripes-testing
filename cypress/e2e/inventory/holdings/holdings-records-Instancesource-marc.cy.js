import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickmarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';

describe('Manage holding records with MARC source', { retries: 2 }, () => {
  const OCLCAuthentication = '100481406/PAOLF';

  before(() => {
    cy.getAdminToken().then(() => {
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
    });
  });

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryActions.import();
    // TODO: redesign to api step
    InventorySteps.addMarcHoldingRecord();
  });

  it(
    'C345409 MARC instance record + MARC holdings record (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      // waiting until page loading
      cy.wait(10000);
      HoldingsRecordView.getId().then((initialHoldindsRecordId) => {
        HoldingsRecordView.checkSource('MARC');
        // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
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
        HoldingsRecordView.getId().then((newHoldindsRecordId) => {
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventoryInstance.checkAddItem(initialHoldindsRecordId);
          InventoryInstance.checkAddItem(newHoldindsRecordId);
        });
      });
    },
  );
});
