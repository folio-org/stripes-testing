import moment from 'moment';

import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';

describe('Circulation log', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    secondServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  let userData;
  let itemBarcode;
  const todayDate = moment(new Date()).format('M/D/YYYY');

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    ServicePoints.createViaApi(testData.secondServicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.secondServicePoint.id,
    });
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.checkinAll.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id, testData.secondServicePoint.id],
          userData.userId,
          testData.servicePoint.id,
        );
        itemBarcode = testData.folioInstances[0].barcodes[0];
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
  });

  after('Delete test data', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePoint.id,
      testData.secondServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    ServicePoints.deleteViaApi(testData.secondServicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C360106 Verify the Service point in the Item Circulation history (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // Go to the "Inventory" => Select "Item" toggle
      InventorySearchAndFilter.switchToItem();
      // Search for an Item with status "Available" by clicking on the "Item status" accordion and selecting "Available" checkbox
      InventorySearchAndFilter.searchByStatus('Available');
      // Click on the link with Items barcode to view the Item
      InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
      ItemRecordView.waitLoading();
      // Click on the "Circulation history" accordion to expand it => Check the "Most recent check in"
      ItemRecordView.checkItemCirculationHistory('-', '-', '-');
      // Navigate to the "Check in" app and check in that Item by pasting the copied Items barcode to the input filled => Hit "Enter" button
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(itemBarcode);
      ConfirmItemInModal.confirmInTransitModal();
      // Go to the "Inventory" => Search for that Item by pasting the copied Items barcode to the input filled => Click "Search"
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.resetAll();
      InventorySearchAndFilter.searchByStatus('In transit');
      InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
      ItemRecordView.waitLoading();
      // The Item has status "In transit"
      ItemRecordView.checkStatus(`In transit to ${testData.secondServicePoint.name}`);
      // Click on the "Circulation history" accordion to expand it => Check the "Most recent check in"
      ItemRecordView.checkItemCirculationHistory(
        todayDate,
        testData.servicePoint.name,
        userData.username,
      );
    },
  );
});
