import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../../support/constants';
import Affiliations from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import NewRequest from '../../../support/fragments/requests/newRequest';
import Requests from '../../../support/fragments/requests/requests';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia Vega', () => {
  const testData = {
    instanceTitle: `AT_C624255_Instance_${getRandomPostfix()}`,
    itemBarcode: uuid(),
  };
  let servicePoint;
  const itemStatus = ITEM_STATUS_NAMES.AVAILABLE;

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
                        cy.getDefaultMaterialType().then((res) => {
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
    cy.setTenant(Affiliations.College);
    InventoryItems.deleteItemViaApi(testData.item.id);
    InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
    cy.resetTenant();
    InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
    cy.get('@requestId').then((id) => {
      Requests.deleteRequestViaApi(id);
    });
  });

  it(
    'C624255 Check that user can create ECS Title level Page request (consortia) (vega)',
    { tags: ['smokeECS', 'vega', 'C624255'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewTitleRequestPage(true);
      NewRequest.enterHridInfo(testData.instanceHRID, true);
      NewRequest.verifyHridInformation([testData.instanceTitle]);
      NewRequest.enterEcsRequesterInfoWithRequestType(
        {
          requesterBarcode: testData.user.barcode,
          pickupServicePoint: servicePoint.name,
        },
        REQUEST_TYPES.PAGE,
      );
      NewRequest.verifyRequestInformation(REQUEST_TYPES.PAGE);
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('requestId');
      });
      cy.pause();
    },
  );
});
