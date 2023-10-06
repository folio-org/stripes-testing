import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  let userData;
  let materialType;
  let testData;
  let ITEM_BARCODE;

  before('Create test data', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      cy.getAdminToken();
      InventoryInstances.getMaterialTypes({ limit: 1 })
        .then((materialTypeRes) => {
          materialType = materialTypeRes;

          testData = {
            folioInstances: InventoryInstances.generateFolioInstances({
              properties: materialType.map(({ id, name }) => ({ materialType: { id, name } })),
            }),
            servicePointA: ServicePoints.getDefaultServicePointWithPickUpLocation(),
            servicePointB: ServicePoints.getDefaultServicePointWithPickUpLocation(),
            requestsId: '',
          };
          ServicePoints.createViaApi(testData.servicePointA);
          ServicePoints.createViaApi(testData.servicePointB);
          ITEM_BARCODE = testData.folioInstances[0].barcodes[0];

          testData.defaultLocation = Locations.getDefaultLocation({
            servicePointId: testData.servicePointB.id,
            secondaryServicePointId: testData.servicePointA.id,
          });
          Locations.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        })
        .then(() => {
          UserEdit.addServicePointsViaApi(
            [testData.servicePointA.id, testData.servicePointB.id],
            userData.userId,
            testData.servicePointA.id,
          );
          cy.login(userData.username, userData.password);
        });
    });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.servicePointB.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePointA.id,
      testData.servicePointB.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointA.id);
    ServicePoints.deleteViaApi(testData.servicePointB.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePointA,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(userData.userId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C589 Check in items at service points for effective location (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // In FOLIO UI, set user's service point to service point A.
      // Service point displays in upper right corner of screen with service point A display name.
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointA.name);
      // Check in Item X
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      // Item is checked in. Check In app displays time returned, item title (item material type), barcode, Item status is Available
      CheckInPane.checkResultsInTheRow([
        ITEM_BARCODE,
        'Available',
        `${testData.folioInstances[0].instanceTitle} (${testData.folioInstances[0].properties.materialType.name})`,
      ]);
      // In  FOLIO UI, change logged in user's service point to service point B
      SwitchServicePoint.switchServicePoint(testData.servicePointB.name);
      // Service point displays in upper right corner of screen with service point B display name.
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointB.name);
      // Check in Item X again
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      // Item is checked in. Check In app displays time returned, item title (item material type), barcode, Item status is Available
      CheckInPane.checkResultsInTheRow(
        [
          ITEM_BARCODE,
          'Available',
          `${testData.folioInstances[0].instanceTitle} (${testData.folioInstances[0].properties.materialType.name})`,
        ],
        1,
      );
    },
  );
});
