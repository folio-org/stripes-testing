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
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import { ORDER_STATUSES, ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';

describe('Claiming', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      name: `AutotestOrg_C692237_${getRandomPostfix()}`,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccount1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
    },
    integrationName: `AutotestIntegration_C692237_${getRandomPostfix()}`,
    pieces: [],
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
                      testData.polTitle = `Autotest_POL_C692237_${getRandomPostfix()}`;

                      const orderLineData = {
                        ...BasicOrderLine.defaultOrderLine,
                        purchaseOrderId: testData.order.id,
                        titleOrPackage: testData.polTitle,
                        claimingActive: true,
                        claimingInterval: 1,
                        checkinItems: false,
                        receiptStatus: 'Awaiting Receipt',
                        cost: {
                          listUnitPrice: 10.0,
                          currency: 'USD',
                          quantityPhysical: 2,
                        },
                        locations: [
                          {
                            locationId: testData.location.id,
                            quantity: 2,
                            quantityPhysical: 2,
                          },
                        ],
                        acquisitionMethod: testData.acquisitionMethod,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: testData.materialType.id,
                          materialSupplier: testData.organization.id,
                          volumes: [],
                        },
                        vendorDetail: {
                          instructions: '',
                          vendorAccount: testData.organization.accounts[0].accountNo,
                          referenceNumbers: [
                            {
                              refNumber: `VendorRef_${getRandomPostfix()}`,
                              refNumberType: 'Vendor order reference number',
                            },
                          ],
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
                            if (pieces && pieces.length >= 2) {
                              testData.pieces = pieces;
                              const updatePromises = pieces.map((piece) => Pieces.updateOrderPieceViaApi({
                                ...piece,
                                receivingStatus: 'Late',
                              }));
                              cy.wrap(Promise.all(updatePromises));
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
        cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
        Organizations.searchByParameters('Name', testData.organization.name);
        Organizations.selectOrganization(testData.organization.name);
        Organizations.addIntegration();
        Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
          integrationName: testData.integrationName,
          integrationDescription: 'Autotest claiming integration',
          integrationType: 'Claiming',
        });
        Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
          transmissionMethod: 'File download',
          fileFormat: 'CSV',
        });
        Organizations.saveOrganization();
        cy.createTempUser([
          Permissions.uiClaimingView.gui,
          Permissions.exportManagerAll.gui,
          Permissions.uiReceivingViewEditCreate.gui,
          Permissions.exportManagerDownloadAndResendFiles.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.claimingPath,
            waiter: Claiming.waitLoading,
          });
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.order?.id) {
      Orders.deleteOrderViaApi(testData.order.id);
    }
    if (testData.organization?.id) {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    }
    if (testData.user?.userId) {
      Users.deleteViaApi(testData.user.userId);
    }
  });

  it(
    'C692237 Claiming jobs for different consecutive runs are displayed in "Export manager" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C692237'] },
    () => {
      Claiming.checkClaimingPaneIsDisplayed();
      Claiming.searchByTitle(testData.polTitle);
      Claiming.verifyPiecesWithTitleDisplayed(testData.polTitle, 2);

      Claiming.selectPieceByRowIndex(0);
      Claiming.sendClaim();
      InteractorsTools.checkCalloutMessage(
        'Claims are currently being processed. Please check Export manager for job status.',
      );
      cy.wait(3000);

      TopMenu.openExportManagerApp();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.selectExportMethod(testData.integrationName);
      cy.wait(5000);
      ExportManagerSearchPane.verifyJobDataInResults(
        [testData.integrationName, 'Successful'],
        true,
      );
      ExportManagerSearchPane.verifyJobsCountInResults(1);

      TopMenu.openClaimingApp();
      Claiming.waitLoading();
      Claiming.checkClaimingPaneIsDisplayed();
      Claiming.searchByTitle(testData.polTitle);
      Claiming.verifyPiecesWithTitleDisplayed(testData.polTitle, 1);

      Claiming.selectPieceByRowIndex(0);
      Claiming.sendClaim();
      InteractorsTools.checkCalloutMessage(
        'Claims are currently being processed. Please check Export manager for job status.',
      );
      cy.wait(3000);

      TopMenu.openExportManagerApp();
      cy.wait(5000);
      ExportManagerSearchPane.verifyJobDataInResults(
        [testData.integrationName, 'Successful'],
        true,
      );
      ExportManagerSearchPane.verifyJobsCountInResults(2);
    },
  );
});
