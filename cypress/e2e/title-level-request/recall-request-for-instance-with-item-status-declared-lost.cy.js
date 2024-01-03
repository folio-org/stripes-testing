import { ITEM_STATUS_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import NewRequest from '../../support/fragments/requests/newRequest';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Title level request for declared lost item', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      status: ITEM_STATUS_NAMES.DECLARED_LOST,
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
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].items[0].barcode,
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C375947 Check that user can not create a TLR Recall for item with status Declared lost',
    { tags: ['extendedPath', 'vega'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstances[0].instanceTitle);
      // Open new request dialog
      InventoryInstance.checkNewRequestAtNewPane();
      NewRequest.verifyTitleLevelRequestsCheckbox('checked');
      // Enter requester barcode
      NewRequest.enterRequesterBarcode(userData.barcode);
      // Error message should be displayed
      NewRequest.verifyErrorMessageForRequestTypeField(
        'None available for this title and patron combination',
      );
    },
  );
});
