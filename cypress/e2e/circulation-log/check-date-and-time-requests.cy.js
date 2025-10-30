import {
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  LOCATION_IDS,
  LOCATION_NAMES,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../support/dictionary';
import { DateTools } from '../../support/utils';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Circulation log', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
  };
  let instanceData;
  let requestDateAndTime;
  let servicePoint;

  before('create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });
    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
      testData.holdingTypeId = holdingTypes[0].id;
    });
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
    });
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiRequestsAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.usersViewRequests.gui,
    ])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        instanceData = testData.folioInstances[0];
        UserEdit.addServicePointViaApi(servicePoint.id, testData.user.userId);
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instanceData.instanceId,
          item: { barcode: instanceData.barcodes[0] },
          itemId: instanceData.itemIds[0],
          pickupServicePointId: servicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: testData.user.userId,
        }).then((request) => {
          requestDateAndTime = request.body.metadata.createdDate;
          testData.requestsId = request.body.id;
        });
      });
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestsId);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData,
      servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350711 Check date and time --requests (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris', 'shiftLeft', 'C350711'] },
    () => {
      // Navigate to the "Circulation log" app
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.circulationLogPath,
        waiter: SearchPane.waitLoading,
      });
      // Select filters under the accordion to trigger result list with a created Request
      SearchPane.setFilterOptionFromAccordion('request', 'Created');
      SearchPane.findResultRowIndexByContent(testData.user.barcode).then((rowIndex) => {
        // Check and note the date and time of the created Request
        SearchPane.checkResultSearch(
          {
            itemBarcode: instanceData.barcodes[0],
            circAction: 'Created',
            object: 'Request',
            date: DateTools.getFormattedDateWithTime(requestDateAndTime),
            servicePoint: servicePoint.name,
          },
          rowIndex,
        );
        // On the row with shown  Request click on "Action dropdown" in the Action column => Select 'Request Details'
        SearchResults.chooseActionByRow(rowIndex, 'Request details');
        RequestDetail.waitLoading();
        // Check the date and time displayed for the Request
        RequestDetail.checkCreatedDate(
          DateTools.getFormattedDateWithTime(requestDateAndTime, { withSpace: true }),
        );
      });
    },
  );
});
