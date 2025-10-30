import {
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  LOCATION_IDS,
  LOCATION_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const patronGroup = {
    name: 'groupToRenew' + getRandomPostfix(),
  };
  const secondUser = {
    active: true,
    username: `secondusername ${getRandomPostfix()}`,
    personal: {
      preferredContactTypeId: '002',
      firstName: 'secondUserFirstName',
      lastName: 'secondUserLastName',
      email: 'test2@folio.org',
    },
    type: 'staff',
  };
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    requestsId: '',
  };
  let firstUser;
  let requestId;
  let FIRST_ITEM_BARCODE;
  let SECOND_ITEM;
  let servicePoint;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
    });
    FIRST_ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
    SECOND_ITEM = testData.folioInstances[1];
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
            holdingsRecordId: SECOND_ITEM.holdings[0].id,
            instanceId: SECOND_ITEM.instanceId,
            item: { barcode: testData.itemBarcode },
            itemId: SECOND_ITEM.itemIds[0],
            pickupServicePointId: servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: userData.id,
          }).then((request) => {
            requestId = request.body.id;
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePoint.id, firstUser.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: FIRST_ITEM_BARCODE,
            servicePointId: servicePoint.id,
            userBarcode: firstUser.barcode,
          });
        });
      cy.getAdminSourceRecord().then((record) => {
        testData.adminSourceRecord = record;
      });
      // Open "Circulation log" by selecting it on the toolbar or "App" dropdown
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.circulationLogPath,
        waiter: SearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: FIRST_ITEM_BARCODE,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint,
      });
    });
    Requests.deleteRequestViaApi(requestId);
    Users.deleteViaApi(secondUser.userId);
    Users.deleteViaApi(firstUser.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C17094 Verify User barcode appears in Circulation log (volaris) (TaaS)',
    { tags: ['criticalPath', 'volaris', 'C17094'] },
    () => {
      const firstItemSearchResultsData = {
        userBarcode: firstUser.barcode,
        itemBarcode: FIRST_ITEM_BARCODE,
        object: 'Loan',
        circAction: 'Checked out',
        servicePoint: servicePoint.name,
        source: testData.adminSourceRecord,
        desc: 'Checked out to proxy: no.',
      };
      const secondItemSearchResultsData = {
        userBarcode: '-',
        itemBarcode: SECOND_ITEM.barcodes[0],
        object: 'Request',
        circAction: 'Created',
        servicePoint: servicePoint.name,
        source: testData.adminSourceRecord,
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
