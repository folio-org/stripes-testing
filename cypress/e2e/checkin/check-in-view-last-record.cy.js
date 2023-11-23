import moment from 'moment';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Users from '../../support/fragments/users/users';
import { DateTools } from '../../support/utils';

describe('Check in', () => {
  let userData;
  let testData;
  let ITEM_BARCODE;
  const todayDate = moment(new Date()).format('M/D/YYYY');
  const itemEditedTime = '7:00 AM';
  const itemEditedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.checkinAll.gui,
      Permissions.uiRequestsView.gui,
      Permissions.uiInventoryViewInstances.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;

        cy.getAdminToken();
        testData = {
          folioInstances: InventoryInstances.generateFolioInstances(),
          servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
          requestsId: '',
        };
        ITEM_BARCODE = testData.folioInstances[0].barcodes[0];

        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Locations.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id],
          userData.userId,
          testData.servicePoint.id,
        );
        cy.login(userData.username, userData.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(userData.userId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C9179 - Check in: view last check in on item record (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      CheckInPane.verifyResultCells();
      CheckInActions.openItemDetails(ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistory(
        todayDate,
        testData.servicePoint.name,
        userData.username,
      );

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.editDateAndTimeReturned(itemEditedDate, itemEditedTime);
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      CheckInPane.verifyResultCells();
      CheckInActions.openItemDetails(ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistory(
        todayDate,
        testData.servicePoint.name,
        userData.username,
      );
    },
  );
});
