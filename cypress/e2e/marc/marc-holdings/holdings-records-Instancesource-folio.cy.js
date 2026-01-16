import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      instanceTitle: `AT_C345406_FolioInstance_${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi({
        instanceTitle: testData.instanceTitle,
      })
        .then((instanceData) => {
          testData.instanceId = instanceData.instanceData.instanceId;

          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            testData.locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.sourceId = folioSource.id;
          });
        })
        .then(() => {
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.instanceId,
            permanentLocationId: testData.locationId,
            sourceId: testData.sourceId,
          }).then((holdingData) => {
            testData.holdingId = holdingData.id;
          });
        });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.deleteHoldingRecordViaApi(testData.holdingId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C345406 FOLIO instance record + FOLIO holdings record (Regression) (folijet)',
      { tags: ['smoke', 'folijet', 'C345406', 'shiftLeft'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
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
        InventoryNewHoldings.close();
        InventoryInstance.checkAddItem(testData.holdingId);
      },
    );
  });
});
