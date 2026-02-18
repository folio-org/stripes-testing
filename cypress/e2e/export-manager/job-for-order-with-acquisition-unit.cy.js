import moment from 'moment';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Integrations from '../../support/fragments/organizations/integrations/integrations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const now = moment();
      const acquisitionUnit = {
        ...AcquisitionUnits.defaultAcquisitionUnit,
        protectDelete: true,
        protectUpdate: true,
        protectCreate: true,
        protectRead: true,
      };
      const order = {
        ...NewOrder.defaultOneTimeOrder,
        approved: true,
      };
      const organization = {
        ...NewOrganization.defaultUiOrganizations,
        accounts: [
          {
            accountNo: getRandomPostfix(),
            accountStatus: 'Active',
            acqUnitIds: [],
            appSystemNo: '',
            description: 'Main library account',
            libraryCode: 'COB',
            libraryEdiCode: getRandomPostfix(),
            name: 'TestAccout1',
            notes: '',
            paymentMethod: 'Cash',
          },
        ],
      };
      const testData = {
        user: {},
      };

      before(() => {
        cy.getAdminToken().then(() => {
          Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
            organization.id = organizationsResponse;
            order.vendor = organizationsResponse;

            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            }).then((acqMethod) => {
              cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
                (locationResp) => {
                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
                    const orderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 20.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 20.0,
                      },
                      locations: [
                        { locationId: locationResp.id, quantity: 1, quantityPhysical: 1 },
                      ],
                      acquisitionMethod: acqMethod.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtypes.body.id,
                        volumes: [],
                      },
                      automaticExport: true,
                      vendorDetail: { vendorAccount: null },
                    };
                    cy.createOrderApi(order).then((orderResponse) => {
                      testData.orderId = orderResponse.body.id;
                      orderLine.purchaseOrderId = orderResponse.body.id;

                      OrderLines.createOrderLineViaApi(orderLine);
                      Orders.updateOrderViaApi({
                        ...orderResponse.body,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      }).then(() => {
                        testData.integration = Integrations.getDefaultIntegration({
                          vendorId: organization.id,
                          acqMethodId: acqMethod.body.acquisitionMethods[0].id,
                          accountNoList: [organization.accounts[0].accountNo],
                          scheduleTime: now.utc().format('HH:mm:ss'),
                          isDefaultConfig: true,
                        });
                        testData.integrationName =
                          testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
                        Integrations.createIntegrationViaApi(testData.integration);
                      });
                    });
                  });
                },
              );
            });
          });
        });

        cy.createTempUser([
          Permissions.exportManagerAll.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
          Permissions.uiOrganizationsViewEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((acqUnitResponse) => {
            acquisitionUnit.id = acqUnitResponse.id;

            AcquisitionUnits.assignUserViaApi(userProperties.userId, acquisitionUnit.id).then(
              (id) => {
                testData.membershipUserId = id;
              },
            );
            cy.getAdminUserDetails().then((adminUser) => {
              AcquisitionUnits.assignUserViaApi(adminUser.id, acquisitionUnit.id).then((id) => {
                testData.membershipAdminId = id;
              });
            });
          });

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.exportManagerOrganizationsPath,
            waiter: ExportManagerSearchPane.waitLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken().then(() => {
          Organizations.deleteOrganizationViaApi(organization.id);
          Integrations.deleteIntegrationViaApi(testData.integration.id);
          Orders.deleteOrderViaApi(testData.orderId);
          AcquisitionUnits.unAssignUserViaApi(testData.membershipUserId);
          AcquisitionUnits.unAssignUserViaApi(testData.membershipAdminId);
          Users.deleteViaApi(testData.user.userId);
          AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
        });
      });

      it(
        'C380640 Schedule export job for order with Acquisition unit (thunderjet) (TaaS)',
        { tags: ['extendedPath', 'thunderjet', 'C380640'] },
        () => {
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.selectExportMethod(testData.integrationName);
          ExportManagerSearchPane.selectJobByIntegrationInList(testData.integrationName);
          ExportManagerSearchPane.rerunJob();
          cy.wait(7000);
          ExportManagerSearchPane.verifyResult('Successful');
          ExportManagerSearchPane.selectJob('Successful');
          ExportManagerSearchPane.verifyJobStatusInDetailView('Successful');
          ExportManagerSearchPane.verifyJobOrganizationInDetailView(organization);
          ExportManagerSearchPane.verifyJobExportMethodInDetailView(testData.integrationName);
        },
      );
    });
  });
});
