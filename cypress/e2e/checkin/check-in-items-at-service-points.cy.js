import { Permissions } from '../../support/dictionary';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
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
  let servicePointA;
  let servicePointB;

  before('Create test data', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      cy.getAdminToken().then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
          servicePointA = sp1;
        });
        ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
          servicePointB = sp2;
        });
      });
      cy.getDefaultMaterialType()
        .then((mt) => {
          materialType = mt;

          testData = {
            folioInstances: InventoryInstances.generateFolioInstances({
              itemsProperties: { materialType: { id: materialType.id } },
            }),
            requestsId: '',
          };
          ITEM_BARCODE = testData.folioInstances[0].barcodes[0];

          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
          });
        })
        .then(() => {
          UserEdit.addServicePointsViaApi(
            [servicePointA.id, servicePointB.id],
            userData.userId,
            servicePointA.id,
          );
          cy.login(userData.username, userData.password);
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: servicePointB.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: servicePointA,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C589 Check in items at service points for effective location (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C589'] },
    () => {
      // In FOLIO UI, set user's service point to service point A.
      // Service point displays in upper right corner of screen with service point A display name.
      SwitchServicePoint.checkIsServicePointSwitched(servicePointA.name);
      // Check in Item X
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      // Item is checked in. Check In app displays time returned, item title (item material type), barcode, Item status is Available
      CheckInPane.checkResultsInTheRow([
        ITEM_BARCODE,
        'Available',
        `${testData.folioInstances[0].instanceTitle} (${materialType.name})`,
      ]);
      // In  FOLIO UI, change logged in user's service point to service point B
      SwitchServicePoint.switchServicePoint(servicePointB.name);
      // Service point displays in upper right corner of screen with service point B display name.
      SwitchServicePoint.checkIsServicePointSwitched(servicePointB.name);
      // Check in Item X again
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      // Item is checked in. Check In app displays time returned, item title (item material type), barcode, Item status is Available
      CheckInPane.checkResultsInTheRow(
        [
          ITEM_BARCODE,
          'Available',
          `${testData.folioInstances[0].instanceTitle} (${materialType.name})`,
        ],
        1,
      );
    },
  );
});
