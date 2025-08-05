import uuid from 'uuid';
import moment from 'moment';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import InTransit from '../../support/fragments/checkin/modals/inTransit';

describe('Accessibility', () => {
  let userData;
  const checkInNote = 'Check-in';
  let itemBarcode;
  let testData;

  before('Create test data', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;
      cy.getAdminToken().then(() => {
        cy.getDefaultMaterialType()
          .then((mt) => {
            const materialType = mt;
            testData = {
              folioInstances: InventoryInstances.generateFolioInstances({
                itemsProperties: { materialType: { id: materialType.id } },
              }),
              servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              servicePointS1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              requestsId: '',
            };
            ServicePoints.createViaApi(testData.servicePointS);
            ServicePoints.createViaApi(testData.servicePointS1);
            itemBarcode = testData.folioInstances[0].barcodes[0];
            testData.defaultLocation = Locations.getDefaultLocation({
              servicePointId: testData.servicePointS1.id,
            }).location;
            Locations.createViaApi(testData.defaultLocation).then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location,
              });
            });
          })
          .then(() => {
            UserEdit.addServicePointsViaApi(
              [testData.servicePointS.id, testData.servicePointS1.id],
              userData.userId,
              testData.servicePointS.id,
            );
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: testData.folioInstances[0].barcodes[0],
              loanDate: moment.utc().format(),
              userBarcode: userData.barcode,
              servicePointId: testData.servicePointS1.id,
            });
            cy.getItems({
              limit: 1,
              expandAll: true,
              query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
            }).then((res) => {
              const itemData = res;
              itemData.circulationNotes = [
                { noteType: 'Check in', note: checkInNote, staffOnly: true },
              ];
              cy.updateItemViaApi(itemData);
            });
          });
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePointS.id,
      testData.servicePointS1.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    ServicePoints.deleteViaApi(testData.servicePointS1.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePointS,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C8358 Verify checkin note is readable with screenreader (vega) (TaaS)',
    {
      tags: ['criticalPath', 'vega', 'C8358'],
    },
    () => {
      // Checkin item
      CheckInActions.checkInItemGui(itemBarcode);
      // Check-in note modal is displayed
      CheckInActions.confirmCheckInLostItem();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.openCheckInNotes();
      CheckInActions.verifyModalIsClosed();
    },
  );
});
