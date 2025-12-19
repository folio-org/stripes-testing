import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { Permissions } from '../../../support/dictionary';
import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      marcInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    const admNote1 = 'Copy, Delete this Holdings 10-21-2022';
    const admNote2 = 'Complex copy, Delete this Holdings 10-22-2022';
    const queryForNote1 = `holdings.administrativeNotes ==/ string "${admNote1}"`;
    const queryForNote2 = `holdings.administrativeNotes ==/ string "${admNote2}"`;
    const searchQueries = [
      'holdings.administrativeNotes = "copy Holdings"',
      'holdings.administrativeNotes == "Delete this Holdings"',
    ];
    const searchQueriesNotExist = [
      'holdings.administrativeNotes == "copy Holdings"',
      'holdings.administrativeNotes ==/ string "Delete this Holdings"',
    ];
    let folioInstanceData;
    let marcInstanceData;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      InventoryHoldings.getHoldingSources().then((holdingsSources) => {
        testData.marcSourceId = holdingsSources[0].id;
        testData.folioSourceId = holdingsSources[1].id;
      });
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
          sourceId: testData.folioSourceId,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.marcInstances,
          location,
          sourceId: testData.marcSourceId,
        });
      });
      folioInstanceData = testData.folioInstances[0];
      marcInstanceData = testData.marcInstances[0];
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.selectSearchOption(
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventorySearchAndFilter.executeSearch(folioInstanceData.instanceTitle);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.addAdministrativeNote(admNote1);
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.close();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.selectSearchOption(
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventorySearchAndFilter.executeSearch(marcInstanceData.instanceTitle);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.addAdministrativeNote(admNote2);
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.close();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: folioInstanceData,
        servicePoint: testData.servicePoint,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: marcInstanceData,
        servicePoint: testData.servicePoint,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359148 Search "Holdings" with source = Folio/MARC by administrative note using query search (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C359148', 'eurekaPhase1'] },
      () => {
        searchQueries.forEach((query) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(query);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifySearchResult(folioInstanceData.instanceTitle);
          InventorySearchAndFilter.verifySearchResult(marcInstanceData.instanceTitle);
        });
        searchQueriesNotExist.forEach((query) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(query);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifyContentNotExistInSearchResult(
            folioInstanceData.instanceTitle,
          );
          InventorySearchAndFilter.verifyContentNotExistInSearchResult(
            marcInstanceData.instanceTitle,
          );
        });
        // Edit the search query to " item.administrativeNotes ==/ string "Copy, Delete this Holdings 10-21-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForNote1);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" record with source value "FOLIO" to which you created "Administrative note" from precondition.
        InventorySearchAndFilter.verifySearchResult(folioInstanceData.instanceTitle);
        // Edit the search query to " item.administrativeNotes ==/ string "Complex copy, Delete this Holdings 10-22-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForNote2);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" record with source value "MARC" to which you created "Administrative note" from precondition.
        InventorySearchAndFilter.verifySearchResult(marcInstanceData.instanceTitle);
      },
    );
  });
});
