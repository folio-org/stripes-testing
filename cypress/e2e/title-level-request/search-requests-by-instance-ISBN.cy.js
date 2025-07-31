import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Requests', () => {
  let userData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C343043_Instance_${getRandomPostfix()}`,
  };
  let defaultLocation;
  let cancellationReason;

  const random4Numbers = randomFourDigitNumber();
  const ISBN = `1234567${random4Numbers}`;
  const ISBN_HYPHENS = `123-456-7-${random4Numbers}`;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Prepare test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
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
          itemData.materialTypeName = res.name;
        });
        cy.getCancellationReasonsApi({ limit: 1 }).then((cancellationReasons) => {
          cancellationReason = cancellationReasons[0].id;
        });
        cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((res) => {
          itemData.productIdType = res.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
            identifiers: [{ identifierTypeId: itemData.productIdType, value: ISBN }],
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
      .then((specialInstanceIds) => {
        itemData.testInstanceIds = specialInstanceIds;
        requestData.instanceId = specialInstanceIds.instanceId;
        requestData.holdingsRecordId = specialInstanceIds.holdingIds[0].id;
        requestData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
      })
      .then(() => {
        cy.createTempUser([Permissions.uiRequestsAll.gui])
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            cy.wrap(true)
              .then(() => {
                requestData.requesterId = userData.userId;
                requestData.pickupServicePointId = servicePoint.id;
              })
              .then(() => {
                cy.createItemRequestApi(requestData);
              });

            UserEdit.addServicePointsViaApi([servicePoint.id], userData.userId, servicePoint.id);

            cy.login(userData.username, userData.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitLoading,
            });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    Requests.deleteRequestViaApi(requestData.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C343043 Search for Requests by Instance ISBN (Normalized) (vega)',
    { tags: ['criticalPath', 'vega', 'C343043'] },
    () => {
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(ISBN);
      Requests.verifyRequestIsPresent(itemData.instanceTitle);
      Requests.clickResetAllButton();
      Requests.findCreatedRequest(ISBN_HYPHENS);
      Requests.verifyRequestIsPresent(itemData.instanceTitle);
      Requests.clickResetAllButton();
    },
  );
});
