import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import NewRequest from '../../support/fragments/requests/newRequest';

describe('Title Level Request. Create Item or Title level request', () => {
  const tlrCheckboxExists = true;
  let userData = {};
  let requestId;
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

  before('Preconditions:', () => {
    cy.getAdminToken()
      .then(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        });
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
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
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
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${instanceData.instanceId}"`,
          }).then((instance) => {
            testData.instanceHRID = instance.hrid;
          });
        });
      });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser(
      [
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsView.gui,
        Permissions.uiRequestsEdit.gui,
        Permissions.requestsAll.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
      // create title-level request for user
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(tlrCheckboxExists);
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosepickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });
      Requests.closePane('Request Detail');
    });
  });

  after('Deleting created entities', () => {
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C1284 Check that "This requester already has an open request for one of instance\'s items" message appears (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // second requester's request for same item
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(tlrCheckboxExists);
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosepickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.checkRequestIsNotAllowedInstanceModal();
    },
  );
});
