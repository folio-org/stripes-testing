import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import Pieces from '../../support/fragments/orders/pieces/pieces';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Claiming from '../../support/fragments/claiming/claiming';
import Receiving from '../../support/fragments/receiving/receiving';
import getRandomPostfix from '../../support/utils/stringTools';
import { ORDER_STATUSES, ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';

describe('Claiming', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      name: `AutotestOrg_C692167_${getRandomPostfix()}`,
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.getViaApi()
      .then((servicePoints) => {
        testData.servicePointId = servicePoints[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
          (location) => {
            testData.location = location;

            Organizations.createOrganizationViaApi(testData.organization).then(
              (organizationResponse) => {
                testData.organization.id = organizationResponse;

                cy.getDefaultMaterialType().then((materialType) => {
                  testData.materialType = materialType;

                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((acquisitionMethodResponse) => {
                    testData.acquisitionMethod =
                      acquisitionMethodResponse.body.acquisitionMethods[0].id;

                    const orderData = {
                      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                      orderType: 'One-Time',
                      approved: true,
                      reEncumber: true,
                    };

                    Orders.createOrderViaApi(orderData).then((orderResponse) => {
                      testData.order = orderResponse;
                      testData.orderNumber = orderResponse.poNumber;

                      const orderLineData = {
                        ...BasicOrderLine.defaultOrderLine,
                        id: uuid(),
                        purchaseOrderId: testData.order.id,
                        titleOrPackage: `Autotest_POL_${getRandomPostfix()}`,
                        claimingActive: true,
                        claimingInterval: 1,
                        checkinItems: false,
                        receiptStatus: 'Awaiting Receipt',
                        cost: {
                          listUnitPrice: 10.0,
                          currency: 'USD',
                          quantityPhysical: 1,
                        },
                        locations: [
                          {
                            locationId: testData.location.id,
                            quantity: 1,
                            quantityPhysical: 1,
                          },
                        ],
                        acquisitionMethod: testData.acquisitionMethod,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: testData.materialType.id,
                          materialSupplier: testData.organization.id,
                          volumes: [],
                        },
                      };

                      OrderLines.createOrderLineViaApi(orderLineData).then((orderLineResponse) => {
                        testData.orderLine = orderLineResponse;

                        Orders.updateOrderViaApi({
                          ...testData.order,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        }).then(() => {
                          cy.wait(3000);

                          Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
                            if (pieces && pieces.length > 0) {
                              testData.piece = pieces[0];
                              Pieces.updateOrderPieceViaApi({
                                ...testData.piece,
                                receivingStatus: 'Late',
                              });
                            }
                          });
                        });
                      });
                    });
                  });
                });
              },
            );
          },
        );
      })
      .then(() => {
        cy.createTempUser([Permissions.uiClaimingView.gui, Permissions.uiReceivingView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.claimingPath,
              waiter: Claiming.waitLoading,
            });
          },
        );
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C692167 User without receiving-edit capabilities cannot perform claim actions (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C692167'] },
    () => {
      Claiming.checkClaimingPaneIsDisplayed();
      Claiming.expandActionsDropdown();
      Claiming.checkActionsMenuOptionExists('Group by organization', true);

      Claiming.checkActionsMenuOptionExists('Send claim', false);
      Claiming.checkActionsMenuOptionExists('Delay claim', false);
      Claiming.checkActionsMenuOptionExists('Unreceivable', false);
    },
  );
});
