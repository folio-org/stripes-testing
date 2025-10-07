import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../../support/constants';
import Affiliations from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import RequestDetail from '../../../support/fragments/requests/requestDetail';
import Requests from '../../../support/fragments/requests/requests';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia Vega', () => {
  const testData = {
    instanceTitle: `AT_C624278_Instance_${getRandomPostfix()}`,
    itemBarcode: uuid(),
  };
  let servicePoint;
  const itemStatus = ITEM_STATUS_NAMES.AVAILABLE;

  let requestId;
  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then((specialInstanceIds) => {
          testData.testInstanceIds = specialInstanceIds;
          requestData.instanceId = specialInstanceIds.instanceId;
          cy.wait(1000).then(() => {
            cy.setTenant(Affiliations.College).then(() => {
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.locationId = res.id;
              });

              InventoryHoldings.getHoldingsFolioSource().then((holdingSources) => {
                testData.holdingSource = holdingSources.id;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.testInstanceIds.instanceId,
                  permanentLocationId: testData.locationId,
                  sourceId: testData.holdingSource,
                })
                  .then((holding) => {
                    testData.holding = holding;

                    cy.getLoanTypes({ limit: 1 }).then((res) => {
                      testData.loanTypeId = res[0].id;
                    });
                    cy.getMaterialTypes({ limit: 1 }).then((res) => {
                      testData.materialTypeId = res.id;
                    });
                  })
                  .then(() => {
                    InventoryItems.createItemViaApi({
                      barcode: testData.itemBarcode,
                      holdingsRecordId: testData.holding.id,
                      materialType: { id: testData.materialTypeId },
                      permanentLoanType: { id: testData.loanTypeId },
                      status: { name: itemStatus },
                    }).then((item) => {
                      testData.item = item;
                    });
                  });
              });
            });
          });
        });
      });

    cy.resetTenant();
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiRequestsAll.gui], 'staff', 'patron').then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointsViaApi([servicePoint.id], testData.user.userId, servicePoint.id);

      cy.wrap(true)
        .then(() => {
          requestData.requesterId = testData.user.userId;
          requestData.pickupServicePointId = servicePoint.id;
          requestData.requester = {
            barcode: testData.user.barcode,
            username: testData.user.username,
            id: testData.user.userId,
            active: true,
            type: 'patron',
            patronGroup: testData.user.userGroup.id,
          };
          requestData.holdingsRecordId = testData.holding.id;
          requestData.itemId = testData.item.id;
          requestData.item = {
            barcode: testData.item.barcode,
          };
        })
        .then(() => {
          Requests.createNewEcsRequestViaApi(requestData).then((createdRequest) => {
            requestId = createdRequest.body.id;
          });
        });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitContentLoading,
        authRefresh: true,
      });
    });
  });

  after('Delete test data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    Users.deleteViaApi(testData.user.userId);
    cy.setTenant(Affiliations.College);
    InventoryItems.deleteItemViaApi(testData.item.id);
    InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
    Locations.deleteViaApi(testData.locationId);
    cy.resetTenant();
    InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
  });

  it(
    'C624278 Check that user can cancel ECS Item level Page request (consortia) (vega)',
    { tags: ['smokeECS', 'vega', 'C624278'] },
    () => {
      Requests.findCreatedRequest(testData.instanceTitle);
      Requests.selectFirstRequest(testData.instanceTitle);
      RequestDetail.openActions();
      RequestDetail.openCancelRequest();
      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Closed - Cancelled',
        level: REQUEST_LEVELS.ITEM,
      });
    },
  );
});
