import moment from 'moment';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Request queue. TLR', () => {
  const users = {
    mainUser: {},
    checkOutUser: {},
  };
  const instanceData = {
    title: getTestEntityValue('Instance'),
    itemBarcodes: [
      `1item${generateUniqueItemBarcodeWithShift()}`,
      `2item${generateUniqueItemBarcodeWithShift()}`,
      `3item${generateUniqueItemBarcodeWithShift()}`,
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          instanceData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          instanceData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          instanceData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: instanceData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcodes[0],
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
            {
              barcode: instanceData.itemBarcodes[1],
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
            {
              barcode: instanceData.itemBarcodes[2],
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
        });
      })
      .then(() => {
        cy.createTempUser([]).then((userPatronProperties) => {
          users.checkOutUser = userPatronProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.checkOutUser.userId,
            testData.userServicePoint.id,
          );
        });
        cy.createTempUser([
          permissions.uiRequestsView.gui,
          permissions.uiRequestsCreate.gui,
          permissions.uiRequestsAll.gui,
          permissions.uiRequestsEdit.gui,
          permissions.checkinAll.gui,
          permissions.inventoryAll.gui,
        ]).then((userPropertiesForMainUser) => {
          users.mainUser = userPropertiesForMainUser;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.mainUser.userId,
            testData.userServicePoint.id,
          );
        });
      })
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        cy.wrap(instanceData.itemBarcodes).each((barcode) => {
          Checkout.checkoutItemViaApi({
            itemBarcode: barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: users.checkOutUser.barcode,
          });
        });
      })
      .then(() => {
        cy.login(users.mainUser.username, users.mainUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.getRequestApi({ query: `(instance.title=="${instanceData.title}")` }).then(
      (requestResponse) => {
        cy.wrap(requestResponse).each((request) => {
          Requests.deleteRequestViaApi(request.id);
        });
      },
    );
    cy.wrap(instanceData.itemBarcodes).each((barcode) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      instanceData.itemBarcodes[0],
    );
    cy.wrap([users.mainUser.userId, users.checkOutUser.userId]).each((id) => {
      UserEdit.changeServicePointPreferenceViaApi(id, [testData.userServicePoint.id]);
      Users.deleteViaApi(id);
    });
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });
  it(
    'C350682 Check that item checked in fulfills the TLR recall at the top of the queue (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C350682'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
      InventoryInstance.checkNewRequestAtNewPane();
      NewRequest.waitForInstanceOrItemSpinnerToDisappear();
      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: users.mainUser.barcode,
          pickupServicePoint: 'Circ Desk 1',
        },
        REQUEST_TYPES.RECALL,
      );
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(instanceData.itemBarcodes[1]);
      ConfirmItemInModal.confirmInTransitModal();
      CheckInActions.endCheckInSessionAndCheckDetailsOfCheckInAreCleared();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(instanceData.title);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.viewRequestsInQueue();
      SearchPane.checkResultSearch({
        requestStatus: 'Open - In transit',
      });
    },
  );
});
