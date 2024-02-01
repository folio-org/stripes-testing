import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickmarcEditor from '../../../support/fragments/quickMarcEditor';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const OCLCAuthentication = '100481406/PAOLF';

    before(() => {
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
      });
    });

    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit(TopMenu.inventoryPath);
      InventoryActions.import();
      // TODO: redesign to api step
      InventorySteps.addMarcHoldingRecord();
    });

    it(
      'C345409 MARC instance record + MARC holdings record (spitfire)',
      { tags: ['smoke', 'spitfire'] },
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
});
