import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import TopMenu from '../../../support/fragments/topMenu';

describe('MARC', () => {
  describe(
    'MARC Holdings',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach(() => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues();
        InventoryNewInstance.clickSaveAndCloseButton();
      });
      it(
        'C345406 FOLIO instance record + FOLIO holdings record (Regression) (spitfire)',
        { tags: ['smoke', 'folijet', 'shiftLeft', 'C345406'] },
        () => {
          InventoryInstance.createHoldingsRecord();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkSource('FOLIO');
          HoldingsRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.viewSource, shouldExist: false },
            { optionName: actionsMenuOptions.editMarcBibliographicRecord, shouldExist: false },
          ]);
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.checkReadOnlyFields();
          HoldingsRecordEdit.closeWithoutSave();
          HoldingsRecordView.tryToDelete();
          HoldingsRecordView.duplicate();
          InventoryNewHoldings.checkSource();
          // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
        },
      );
    },
  );
});
