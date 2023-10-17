import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Circulation log', () => {
  const patronGroup = {
    name: 'groupToRenew' + getRandomPostfix(),
  };
  const secondUser = {
    active: true,
    username: `secondUserName ${getRandomPostfix()}`,
    personal: {
      preferredContactTypeId: '002',
      firstName: 'secondUserFirstName',
      lastName: 'secondUserLastName',
      email: 'test2@folio.org',
    },
  };
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  let firstUser;
  let requestId;
  let FIRST_ITEM_BARCODE;
  let SECOND_ITEM;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
      FIRST_ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
      SECOND_ITEM = testData.folioInstances[1];
    });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser([Permissions.circulationLogAll.gui]).then((userProperties) => {
      firstUser = userProperties;
      Users.createViaApi({
        patronGroup: patronGroup.id,
        ...secondUser,
        barcode: null,
      })
        .then((userData) => {
          secondUser.userId = userData.id;
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: SECOND_ITEM.holdingId,
            instanceId: SECOND_ITEM.instanceId,
            item: { barcode: testData.itemBarcode },
            itemId: SECOND_ITEM.itemIds[0],
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: userData.id,
          }).then((request) => {
            requestId = request.body.id;
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, firstUser.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: FIRST_ITEM_BARCODE,
            servicePointId: testData.servicePoint.id,
            userBarcode: firstUser.barcode,
          });
        });
      // Open "Circulation log" by selecting it on the toolbar or "App" dropdown
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.circulationLogPath,
        waiter: SearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: FIRST_ITEM_BARCODE,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(firstUser.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
      });
    });
    Requests.deleteRequestViaApi(requestId);
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(secondUser.userId);
    Users.deleteViaApi(firstUser.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C17094 Verify User barcode appears in Circulation log (volaris) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.volaris] },
    () => {
      const firstItemSearchResultsData = {
        userBarcode: firstUser.barcode,
        itemBarcode: FIRST_ITEM_BARCODE,
        object: 'Loan',
        circAction: 'Checked out',
        servicePoint: testData.servicePoint.name,
        source: 'ADMINISTRATOR, Diku_admin',
        desc: 'Checked out to proxy: no.',
      };
      const secondItemSearchResultsData = {
        userBarcode: '-',
        itemBarcode: SECOND_ITEM.barcodes[0],
        object: 'Request',
        circAction: 'Created',
        servicePoint: testData.servicePoint.name,
        source: 'ADMINISTRATOR, Diku_admin',
        desc: 'Type: Page.',
      };
      // Apply any filters in "Search & filter" pane to retrieve logs in "Circulation log" pane
      SearchPane.setFilterOptionFromAccordion('loan', 'Checked out');
      // User barcodes are displayed in "User barcode" column
      SearchPane.findResultRowIndexByContent(FIRST_ITEM_BARCODE).then((rowIndex) => {
        SearchPane.checkResultSearch(firstItemSearchResultsData, rowIndex);
      });
      SearchPane.resetFilters();

      // Apply any filters in "Search & filter" pane to retrieve logs in "Circulation log" pane
      SearchPane.setFilterOptionFromAccordion('request', 'Created');
      // "-" is displayed in "User barcode" column if the User doesn't have barcode
      SearchPane.findResultRowIndexByContent(SECOND_ITEM.barcodes[0]).then((rowIndex) => {
        SearchPane.checkResultSearch(secondItemSearchResultsData, rowIndex);
      });
    },
  );
});
