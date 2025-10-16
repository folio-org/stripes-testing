import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Verify that patron cannot place item level requests on title with existing request', () => {
  let userData = {};
  let servicePoint;
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C350685_Instance_${getRandomPostfix()}`,
  };
  let defaultLocation;
  let instanceData;
  let titleLevelRequestId;

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((sp) => {
        servicePoint = sp;
        itemData.servicePointId = servicePoint.id;
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
      })
      .then((location) => {
        defaultLocation = location;
        cy.getInstanceTypes({ limit: 1 });
      })
      .then((instanceTypes) => {
        itemData.instanceTypeId = instanceTypes[0].id;
        cy.getHoldingTypes({ limit: 1 });
      })
      .then((res) => {
        itemData.holdingTypeId = res[0].id;
        cy.getLoanTypes({ limit: 1 });
      })
      .then((res) => {
        itemData.loanTypeId = res[0].id;
        cy.getDefaultMaterialType();
      })
      .then((res) => {
        itemData.materialTypeId = res.id;
        itemData.materialTypeName = res.name;
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: itemData.holdingTypeId,
              permanentLocationId: defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
          ],
        });
      })
      .then((instance) => {
        instanceData = instance;
        cy.createTempUser([
          Permissions.uiRequestsAll.gui,
          Permissions.uiRequestsView.gui,
          Permissions.uiRequestsCreate.gui,
          Permissions.uiRequestsEdit.gui,
        ]);
      })
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointsViaApi(
          [itemData.servicePointId],
          userData.userId,
          itemData.servicePointId,
        );
      })
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
      })
      .then(() => {
        cy.createItemRequestApi({
          requesterId: userData.userId,
          instanceId: instanceData.instanceId,
          pickupServicePointId: servicePoint.id,
          requestType: REQUEST_TYPES.PAGE,
          requestLevel: REQUEST_LEVELS.TITLE,
          requestDate: new Date().toISOString(),
          fulfillmentPreference: 'Hold Shelf',
        });
      })
      .then((titleRequest) => {
        titleLevelRequestId = titleRequest.id;
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: RequestsSearchResultsPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(titleLevelRequestId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceData.instanceId);
    Users.deleteViaApi(userData.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
  });

  it(
    'C350685 Verify that patron cannot place item level requests on title with existing request (vega)',
    { tags: ['extendedPath', 'vega', 'C350685'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();

      NewRequest.verifyTitleLevelRequestsCheckbox(false);
      NewRequest.unselectTitleLevelRequest();

      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.enterItemInfo(itemData.barcode);
      NewRequest.verifyItemInformation([itemData.barcode, ITEM_STATUS_NAMES.AVAILABLE]);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(servicePoint.name);
      NewRequest.saveRequestAndClose();
      NewRequest.checkRequestIsNotAllowedModal();
    },
  );
});
