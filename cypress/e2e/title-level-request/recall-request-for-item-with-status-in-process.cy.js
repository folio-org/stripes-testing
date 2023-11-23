import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import { REQUEST_TYPES, ITEM_STATUS_NAMES } from '../../support/constants';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import NewRequest from '../../support/fragments/requests/newRequest';
import SettingsMenu from '../../support/fragments/settingsMenu';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import UserEdit from '../../support/fragments/users/userEdit';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';

describe('Title level request', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      status: ITEM_STATUS_NAMES.IN_PROCESS,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let userData;
  let defaultLocation;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.requestsAll.gui,
      Permissions.uiRequestsEdit.gui,
      Permissions.uiRequestsCreate.gui,
      Permissions.inventoryAll.gui,
      Permissions.checkinAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userData.userId,
        testData.servicePoint.id,
      );
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.getRequestApi({
      query: `(item.barcode=="${testData.folioInstances[0].barcodes[0]}")`,
    }).then((requests) => {
      Requests.deleteRequestViaApi(requests[0].id);
    });
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C375939 Check that user can create a TLR Recall for Item with status In process (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstances[0].instanceTitle);
      InventoryInstance.checkNewRequestAtNewPane();
      NewRequest.verifyTitleLevelRequestsCheckbox('checked');
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.RECALL);
      NewRequest.choosepickupServicePoint(testData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      NewRequest.verifyRequestSuccessfullyCreated(userData.username);
      RequestDetail.checkItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
      RequestDetail.checkRequestsOnItem('1');
    },
  );
});
