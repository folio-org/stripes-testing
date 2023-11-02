import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';

describe('Check In - Actions', () => {
  let userData;
  let materialTypes;
  let testData;
  let checkInResultsData;
  let ITEM_BARCODE;

  before('Preconditions', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      cy.getAdminToken().then(() => {
        InventoryInstances.getMaterialTypes({ limit: 1 })
          .then((materialTypesRes) => {
            materialTypes = materialTypesRes;

            testData = {
              folioInstances: InventoryInstances.generateFolioInstances({
                properties: materialTypes.map(({ id, name }) => ({ materialType: { id, name } })),
              }),
              servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              servicePointS1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              requestsId: '',
            };
            ServicePoints.createViaApi(testData.servicePointS);
            ServicePoints.createViaApi(testData.servicePointS1);
            checkInResultsData = {
              statusForS: [`In transit - ${testData.servicePointS1.name}`],
              statusForS1: ['Awaiting pickup'],
            };
            ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
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
            cy.login(userData.username, userData.password);
          });
      });
    });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.servicePointS.id,
      checkInDate: new Date().toISOString(),
    });
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
    "C588 Check in: at service point not assigned to item's effective location (vega) (TaaS)",
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();

      // Scan item in Check In app
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      InTransit.verifyModalTitle();
      InTransit.verifySelectedCheckboxPrintSlip();
      // Close modal and Close print window without printing.
      ConfirmItemInModal.confirmInTransitModal();
      // Check In app displays item information
      CheckInPane.checkResultsInTheRow([ITEM_BARCODE]);
      CheckInPane.checkResultsInTheRow([
        `${testData.folioInstances[0].instanceTitle} (${testData.folioInstances[0].properties.materialType.name})`,
      ]);
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);
      // Open ellipsis menu for item that has been checked in.
      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'itemDetails']);

      // Scan item in Check In app
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      InTransit.verifyModalTitle();
      InTransit.verifySelectedCheckboxPrintSlip();
      // Uncheck "Print slip" checkbox. Close modal.
      InTransit.unselectCheckboxPrintSlip();
      // Close modal
      InTransit.closeModal();
      // Check In app displays item information
      CheckInPane.checkResultsInTheRow([ITEM_BARCODE]);
      CheckInPane.checkResultsInTheRow([
        `${testData.folioInstances[0].instanceTitle} (${testData.folioInstances[0].properties.materialType.name})`,
      ]);
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);
      // Open ellipsis menu for item that has been checked in.
      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'itemDetails']);
    },
  );
});
