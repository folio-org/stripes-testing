import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import { REQUEST_TYPES, FULFILMENT_PREFERENCES, REQUEST_LEVELS } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';

describe('Title Level Request', () => {
  let userData = {};
  let requestId;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
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
    OtherSettings.setOtherSettingsViaApi({ titleLevelRequestsFeatureEnabled: true });
    cy.createTempUser([
      Permissions.uiRequestsCreate.gui,
      Permissions.uiRequestsView.gui,
      Permissions.uiRequestsEdit.gui,
      Permissions.requestsAll.gui,
      Permissions.tlrEdit.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      cy.login(userData.username, userData.password, {
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: testData.folioInstances[0].instanceId,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: userData.userId,
      }).then((createdRequest) => {
        requestId = createdRequest.body.id;
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C1285 Check that "Cannot change -Allow title level requests-" modal appears (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      TitleLevelRequests.clickOnTLRCheckbox();
      TitleLevelRequests.checkCannotChangeTLRModal();
    },
  );
});
