import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import { Permissions } from '../../../support/dictionary';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      marcInstances: InventoryInstances.generateFolioInstances(),
      folioInstances: InventoryInstances.generateFolioInstances(),
      userServicePoint: ServicePoints.getDefaultServicePoint(),
    };
    const admNote1 = 'Original, Update this instance 12-01-2022';
    const admNote2 = 'Original + pcc, Update this instance 12-02-2022';
    const queryForAdmNote1 = `administrativeNotes ==/ string "${admNote1}"`;
    const queryForAdmNote2 = `administrativeNotes ==/ string "${admNote2}"`;
    const searchQueries = [
      'administrativeNotes = "original instance"',
      'administrativeNotes == "update this instance"',
    ];
    const searchQueriesNotExist = [
      'administrativeNotes == "original instance"',
      'administrativeNotes ==/ string "update this instance"',
    ];
    let folioInstanceData;
    let marcInstanceData;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createMarcInstancesViaApi({
          marcInstances: testData.marcInstances,
          location,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
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
        InventorySearchAndFilter.selectSearchOption('Title (all)');
        InventorySearchAndFilter.executeSearch(testData.folioInstances[0].instanceTitle);
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.addAdministrativeNote(admNote1);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceAdministrativeNote(admNote1);
        InventoryItems.closeItem();
        InventorySearchAndFilter.selectSearchOption('Title (all)');
        InventorySearchAndFilter.executeSearch(testData.marcInstances[0].instanceTitle);
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.addAdministrativeNote(admNote2);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceAdministrativeNote(admNote2);
        InventoryItems.closeItem();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: marcInstanceData,
        servicePoint: testData.userServicePoint,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: folioInstanceData,
        servicePoint: testData.userServicePoint,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359146 Search "Instance" with source = Folio/MARC by administrative note using query search (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C359146', 'eurekaPhase1'] },
      () => {
        searchQueries.forEach((searchQuery) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(searchQuery);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifySearchResult(folioInstanceData.instanceTitle);
          InventorySearchAndFilter.verifySearchResult(marcInstanceData.instanceTitle);
        });
        searchQueriesNotExist.forEach((searchQuery) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(searchQuery);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifyContentNotExistInSearchResult(
            folioInstanceData.instanceTitle,
          );
          InventorySearchAndFilter.verifyContentNotExistInSearchResult(
            marcInstanceData.instanceTitle,
          );
        });
        // Edit the search query to " administrativeNotes ==/ string "Original, Update this instance 12-01-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForAdmNote1);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №1 from precondition.
        InventorySearchAndFilter.verifySearchResult(folioInstanceData.instanceTitle);
        // Edit the search query to " administrativeNotes ==/ string "Original + pcc, Update this instance 12-02-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForAdmNote2);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №2 from precondition.
        InventorySearchAndFilter.verifySearchResult(marcInstanceData.instanceTitle);
      },
    );
  });
});
