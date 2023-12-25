import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../support/dictionary';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
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
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let instanceData;
  let requestDateAndTime;

  before('create test data', () => {
    cy.getAdminToken();
    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
      testData.holdingTypeId = holdingTypes[0].id;
    });
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.requestsAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.usersViewRequests.gui,
    ])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        instanceData = testData.folioInstances[0];
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instanceData.instanceId,
          item: { barcode: instanceData.barcodes[0] },
          itemId: instanceData.itemIds[0],
          pickupServicePointId: testData.servicePoint.id,
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
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Requests.deleteRequestViaApi(testData.requestsId);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData,
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350711 Check date and time --requests (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris'] },
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
            servicePoint: testData.servicePoint.name,
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
