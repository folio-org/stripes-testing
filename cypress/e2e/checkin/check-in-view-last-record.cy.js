import moment from 'moment';
import { Permissions } from '../../support/dictionary';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
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
  let servicePoint;
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

        cy.getAdminToken().then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
            servicePoint = sp;
          });
        });
        testData = {
          folioInstances: InventoryInstances.generateFolioInstances(),
          requestsId: '',
        };
        ITEM_BARCODE = testData.folioInstances[0].barcodes[0];

        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
        });
      })
      .then(() => {
        UserEdit.addServicePointsViaApi([servicePoint.id], userData.userId, servicePoint.id);
        cy.login(userData.username, userData.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C9179 Check in: view last check in on item record (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C9179'] },
    () => {
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      CheckInPane.verifyResultCells();
      CheckInActions.openItemDetails(ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistory(todayDate, servicePoint.name, userData.username);

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.editDateAndTimeReturned(itemEditedDate, itemEditedTime);
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      CheckInPane.verifyResultCells();
      CheckInActions.openItemDetails(ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistory(todayDate, servicePoint.name, userData.username);
    },
  );
});
