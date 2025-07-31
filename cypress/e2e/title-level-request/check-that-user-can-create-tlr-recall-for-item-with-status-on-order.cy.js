import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
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
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Title level Request', () => {
  const users = {
    mainUser: {},
  };
  const instanceData = {
    title: getTestEntityValue('Instance'),
    itemBarcode: generateUniqueItemBarcodeWithShift(),
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
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.ON_ORDER },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiRequestsAll.gui,
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
    CheckInActions.checkinItemViaApi({
      itemBarcode: instanceData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    UserEdit.changeServicePointPreferenceViaApi(users.mainUser.userId, [
      testData.userServicePoint.id,
    ]);
    Users.deleteViaApi(users.mainUser.userId);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C375942 Check that user can create a TLR Recall for Item with status On order (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C375942'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
      InventoryInstance.checkNewRequestAtNewPane();
      NewRequest.verifyHridInformation([instanceData.title]);

      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: users.mainUser.barcode,
          pickupServicePoint: 'Circ Desk 1',
        },
        REQUEST_TYPES.RECALL,
      );
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      NewRequest.verifyRequestSuccessfullyCreated(users.mainUser.username);
      RequestDetail.waitLoading();
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: instanceData.title,
      });
    },
  );
});
