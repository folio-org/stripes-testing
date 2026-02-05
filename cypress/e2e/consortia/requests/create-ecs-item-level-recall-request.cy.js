import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../../support/constants';
import Affiliations from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import NewRequest from '../../../support/fragments/requests/newRequest';
import RequestDetail from '../../../support/fragments/requests/requestDetail';
import Requests from '../../../support/fragments/requests/requests';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia Vega', () => {
  const testData = {
    instanceTitle: `AT_C624258_Instance_${getRandomPostfix()}`,
    itemBarcode: uuid(),
  };
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemStatus = ITEM_STATUS_NAMES.CHECKED_OUT;

  before('Create test data', () => {
    cy.resetTenant();
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint);

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          testData.materialTypeId = res.id;
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

          cy.wait(10000).then(() => {
            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${specialInstanceIds.instanceId}"`,
            })
              .then((instance) => {
                testData.instanceHRID = instance.hrid;
              })
              .then(() => {
                cy.setTenant(Affiliations.College).then(() => {
                  cy.getHoldingTypes({ limit: 1 }).then((res) => {
                    testData.holdingTypeId = res[0].id;
                  });
                  cy.getLoanTypes({ limit: 1 }).then((res) => {
                    testData.loanTypeId = res[0].id;
                  });
                  cy.getMaterialTypes({ limit: 1 }).then((res) => {
                    testData.materialTypeId = res.id;
                  });

                  const locationData = Locations.getDefaultLocation({
                    servicePointId: ServicePoints.getDefaultServicePoint().id,
                  }).location;
                  Locations.createViaApi(locationData).then((location) => {
                    testData.location = location;
                    InventoryHoldings.getHoldingsFolioSource().then((holdingSources) => {
                      testData.holdingSource = holdingSources.id;

                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: testData.testInstanceIds.instanceId,
                        permanentLocationId: testData.location.id,
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
        });
      });

    cy.resetTenant();
    cy.getAdminToken();
    TitleLevelRequests.enableTLRViaApi();
    cy.createTempUser([Permissions.uiRequestsAll.gui], 'staff', 'patron').then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointsViaApi([servicePoint.id], testData.user.userId, servicePoint.id);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [servicePoint.id]);
    Users.deleteViaApi(testData.user.userId);
    ServicePoints.deleteViaApi(servicePoint.id);
    cy.setTenant(Affiliations.College);
    InventoryItems.deleteItemViaApi(testData.item.id);
    InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
    Locations.deleteViaApi(testData.location);
    cy.resetTenant();
    InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
    cy.get('@requestId').then((id) => {
      Requests.deleteRequestViaApi(id);
    });
  });

  it(
    'C624258 Check that user can create ECS Item level Recall request (consortia) (vega)',
    { tags: ['smokeECS', 'vega', 'C624258'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.unselectTitleLevelRequest();
      NewRequest.enterItemInfo(testData.itemBarcode);
      NewRequest.enterRequesterBarcode(testData.user.barcode);
      NewRequest.verifyRequesterInformation(testData.user.username, testData.user.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.RECALL);
      NewRequest.choosePickupServicePoint(servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('requestId');
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.RECALL,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });
    },
  );
});
