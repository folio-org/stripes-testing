import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request. Create Item or Title level request', () => {
  const tlrCheckboxExists = true;
  let requestId;
  let userData = {};
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };
  const fulfillmentPreference = 'Hold Shelf';

  before('Preconditions:', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_C347886_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        });
      });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser(
      [
        permissions.uiRequestsCreate.gui,
        permissions.uiRequestsView.gui,
        permissions.uiRequestsEdit.gui,
        permissions.uiRequestsAll.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      cy.waitForAuthRefresh(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: RequestsSearchResultsPane.waitLoading,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.log(`REQUEST ID:    ${requestId}`);
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C347886 Check that user can create Item level request from Request app (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C347886'] },
    () => {
      cy.log(`userServicePoint  : ${testData.userServicePoint.name}`);
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(tlrCheckboxExists);
      NewRequest.verifyTitleLevelRequestsCheckbox();
      NewRequest.enterItemInfo(testData.itemBarcode);
      NewRequest.verifyItemInformation([
        testData.itemBarcode,
        instanceData.title,
        testData.defaultLocation.name,
        ITEM_STATUS_NAMES.AVAILABLE,
      ]);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode, patronGroup.name);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.verifyRequestInformation(ITEM_STATUS_NAMES.AVAILABLE);
      NewRequest.verifyFulfillmentPreference(fulfillmentPreference);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });
    },
  );
});
