import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import {
  ITEM_STATUS_NAMES,
  REQUEST_TYPES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
} from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import NewRequest from '../../support/fragments/requests/newRequest';

describe('Title Level Request', () => {
  let userData = {};
  let requestId;
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 1,
      status: ITEM_STATUS_NAMES.AVAILABLE,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    tlrCheckboxExists: true,
  };

  before('Preconditions:', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.requestsAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.usersViewRequests.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
    });
  });

  it(
    'C380544 Verify that the item information is not changed in "Item information" accordion after editing a request. (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      Requests.waitLoading();
      console.log(testData.folioInstances);
      // NewRequest.createNewRequest({
      //   itemBarcode: instanceData.itemBarcode,
      //   itemTitle: instanceData.title,
      //   requesterBarcode: userForRequest.barcode,
      //   pickupServicePoint: testData.userServicePoint.name,
      //   requestType: REQUEST_TYPES.RECALL,
      // });
    },
  );
});
