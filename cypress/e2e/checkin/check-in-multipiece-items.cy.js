import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MultipieceCheckIn from '../../support/fragments/checkin/modals/multipieceCheckIn';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';

let testData;
let userData;
let materialType;
const itemProps = [];
let testItems;
let itemBarcodes;

describe('Check In', () => {
  before('create inventory instances', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;
      cy.getAdminToken().then(() => {
        cy.getDefaultMaterialType()
          .then((mt) => {
            materialType = mt;
            itemProps.push(MultipieceCheckIn.getItemProps(1, false, false, materialType.name));
            itemProps.push(MultipieceCheckIn.getItemProps(3, true, false, materialType.name));
            itemProps.push(MultipieceCheckIn.getItemProps(2, true, true, materialType.name));
            itemProps.push(MultipieceCheckIn.getItemProps(0, false, true, materialType.name));
            testData = {
              folioInstances: InventoryInstances.generateFolioInstances({
                count: 4,
                itemsProperties: itemProps,
              }),
              servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
            };
            testItems = testData.folioInstances;
            itemBarcodes = testItems.map((item) => item.barcodes[0]);
            ServicePoints.createViaApi(testData.servicePoint);
            testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
            Locations.createViaApi(testData.defaultLocation).then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testItems,
                location,
              });
            });
          })
          .then(() => {
            UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
          });
        cy.login(userData.username, userData.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    testItems.forEach((instance) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: instance.barcodes[0],
        servicePointId: testData.servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    testItems.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C590 Check in: multipiece items (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C590'] },
    () => {
      // Enter barcode for item A (number of pieces set to 1, and description of pieces, number of missing pieces, and description of missing pieces left blank)
      CheckInActions.checkInItem(itemBarcodes[0]);
      // Confirm multipiece check in modal does not appear.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsAbsent();
      // Enter barcode for item B (number of pieces set to a number greater than 1 and/or some value for description of pieces; number of missing pieces and description of missing pieces left blank)
      CheckInActions.waitLoading();
      CheckInActions.checkInItem(itemBarcodes[1]);
      // Confirm multipiece check in modal appears: <Title of item> (<material type of item>) (Barcode: <barcode of item>) will be checked in.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[1]);
      // Click Cancel and Item is not checked in.
      MultipieceCheckIn.cancelMultipieceCheckInModal(itemBarcodes[1]);
      // Enter barcode for item B again.
      CheckInActions.checkInItem(itemBarcodes[1]);
      // Same modal from step 3 displays.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      // Click check in.
      // Item is checked in.
      CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(itemBarcodes[1]);
      // Enter barcode for item C (number of pieces set to a number greater than 1 and/or some value for description of pieces, and some value for number of missing pieces and/or description of missing pieces)
      CheckInActions.checkInItem(itemBarcodes[2]);
      // Confirm multipiece check in modal appears.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[2]);
      // Click check in.Item is checked in.
      CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(itemBarcodes[2]);
      // Enter barcode for item D (number of pieces left blank, description of pieces left blank, and some value for number of missing pieces and/or description of missing pieces)
      CheckInActions.checkInItem(itemBarcodes[3]);
      // Confirm multipiece check in modal appears.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[3]);
      // Click check in. Item is checked in.
      CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(itemBarcodes[3]);
    },
  );
});
