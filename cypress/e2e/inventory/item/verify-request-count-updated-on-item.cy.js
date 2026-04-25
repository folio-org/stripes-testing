import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewRequest from '../../../support/fragments/requests/newRequest';
import RequestDetail from '../../../support/fragments/requests/requestDetail';
import Requests from '../../../support/fragments/requests/requests';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `AT_C637_Instance_${getRandomPostfix()}`,
    };
    const userData1 = {};
    const userData2 = {};
    const requestIds = [];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(servicePoint);
          itemData.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(itemData.defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
          });
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
                permanentLocationId: itemData.defaultLocation.id,
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
          }).then((specialInstanceIds) => {
            itemData.testInstanceIds = specialInstanceIds;
          });
        })
        .then(() => {
          cy.createTempUser([permissions.uiRequestsAll.gui, permissions.inventoryAll.gui]).then(
            (userProperties) => {
              userData1.username = userProperties.username;
              userData1.password = userProperties.password;
              userData1.userId = userProperties.userId;
              userData1.barcode = userProperties.barcode;
              userData1.fullName = `${userProperties.username}, ${Users.defaultUser.personal.preferredFirstName} ${Users.defaultUser.personal.middleName}`;
              UserEdit.addServicePointsViaApi([servicePoint.id], userData1.userId, servicePoint.id);
            },
          );

          cy.createTempUser([]).then((userProperties) => {
            userData2.username = userProperties.username;
            userData2.password = userProperties.password;
            userData2.userId = userProperties.userId;
            userData2.barcode = userProperties.barcode;
            UserEdit.addServicePointsViaApi([servicePoint.id], userData2.userId, servicePoint.id);
          });
        })
        .then(() => {
          cy.login(userData1.username, userData1.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      requestIds.forEach((id) => {
        Requests.deleteRequestViaApi(id);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      UserEdit.changeServicePointPreferenceViaApi(userData1.userId, [servicePoint.id]);
      UserEdit.changeServicePointPreferenceViaApi(userData2.userId, [servicePoint.id]);
      Users.deleteViaApi(userData1.userId);
      Users.deleteViaApi(userData2.userId);
      ServicePoints.deleteViaApi(servicePoint.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        itemData.defaultLocation.institutionId,
        itemData.defaultLocation.campusId,
        itemData.defaultLocation.libraryId,
        itemData.defaultLocation.id,
      );
    });

    it(
      'C637 Item --> Verify if request count properly updated if request(s) has been created (vega)',
      { tags: ['extendedPath', 'vega', 'C637'] },
      () => {
        // Step 1: Create first request
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enterItemInfo(itemData.barcode);
        NewRequest.enterRequesterBarcode(userData1.barcode);
        NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
        NewRequest.choosePickupServicePoint(servicePoint.name);
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then((intercept) => {
          requestIds.push(intercept.response.body.id);
          cy.location('pathname').should('eq', `/requests/view/${intercept.response.body.id}`);
        });
        NewRequest.verifyRequestSuccessfullyCreated(userData1.username);

        // Step 2: Navigate to the item record via item barcode link
        RequestDetail.waitLoading('no staff');
        RequestDetail.checkItemInformation({
          itemBarcode: itemData.barcode,
          title: itemData.instanceTitle,
          effectiveLocation: itemData.defaultLocation.name,
          itemStatus: ITEM_STATUS_NAMES.PAGED,
          requestsOnItem: '1',
        });
        cy.wait(3000);
        RequestDetail.openItemByBarcode(itemData.barcode);

        // Step 3: Verify item record has 1 request in "Loan and availability" accordion
        ItemRecordView.verifyRequestsCount(1);

        // Step 4: Go back to Requests app and create another request with a different user
        cy.visit(TopMenu.requestsPath);
        Requests.waitLoading();
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enterItemInfo(itemData.barcode);
        NewRequest.enterRequesterBarcode(userData2.barcode);
        NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
        NewRequest.choosePickupServicePoint(servicePoint.name);
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then((intercept) => {
          requestIds.push(intercept.response.body.id);
          cy.location('pathname').should('eq', `/requests/view/${intercept.response.body.id}`);
        });
        NewRequest.verifyRequestSuccessfullyCreated(userData2.username);

        // Step 5: Verify the item record now shows 2 requests
        RequestDetail.waitLoading('no staff');
        RequestDetail.checkItemInformation({
          itemBarcode: itemData.barcode,
          title: itemData.instanceTitle,
          effectiveLocation: itemData.defaultLocation.name,
          itemStatus: ITEM_STATUS_NAMES.PAGED,
          requestsOnItem: '2',
        });
        cy.wait(3000);
        RequestDetail.openItemByBarcode(itemData.barcode);
        ItemRecordView.verifyRequestsCount(2);
      },
    );
  });
});
