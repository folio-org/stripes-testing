import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { Permissions } from '../../../support/dictionary';
import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('marc', () => {
  describe('MARC Holdings', () => {
    const testData = {
      marcInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    let marcInstanceData;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      InventoryHoldings.getHoldingSources().then((holdingsSources) => {
        testData.marcSourceId = holdingsSources[0].id;
      });
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          location,
          sourceId: testData.folioSourceId,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.marcInstances,
          location,
          sourceId: testData.marcSourceId,
        });
      });
      marcInstanceData = testData.marcInstances[0];
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: marcInstanceData,
        servicePoint: testData.servicePoint,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C417047 Update MARC Holdings via quickMARC; check for updated 005 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchBySourceHolding('MARC');
        InventoryInstances.selectInstance(5);

        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.close();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField('852', '$b  E');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndCloseAndReturnHoldingsDetailsPage();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains('$b E');
      },
    );
  });
});
