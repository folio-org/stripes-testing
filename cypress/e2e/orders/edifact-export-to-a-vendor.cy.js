import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Integrations from '../../support/fragments/organizations/integrations/integrations';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const now = moment();
      const order = {
        ...NewOrder.defaultOneTimeOrder,
        orderType: 'Ongoing',
        ongoing: { isSubscription: false, manualRenewal: false },
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
          {
            accountNo: getRandomPostfix(),
            accountStatus: 'Active',
            acqUnitIds: [],
            appSystemNo: '',
            description: 'Main library account',
            libraryCode: 'COB',
            libraryEdiCode: getRandomPostfix(),
            name: 'TestAccout2',
            notes: '',
            paymentMethod: 'Cash',
          },
        ],
      };
      const integrations = [];
      let user;
      let location;
      let servicePointId;
      let orderNumber;

      before(() => {
        cy.getAdminToken();

        ServicePoints.getViaApi().then((servicePoint) => {
          servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
            location = res;
          });
        });
        Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
          organization.id = organizationsResponse;
          order.vendor = organizationsResponse;
        });

        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        }).then(({ body: { acquisitionMethods } }) => {
          const acqMethod = acquisitionMethods.find(
            ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
          );

          now.set('second', now.second() + 60);

          organization.accounts.forEach((account) => {
            const integration = Integrations.getDefaultIntegration({
              vendorId: organization.id,
              acqMethodId: acqMethod.id,
              accountNoList: [account.accountNo],
              ediFtp: {
                ftpFormat: 'SFTP',
                serverAddress: 'sftp://ftp.ci.folio.org',
                orderDirectory: '/ftp/files/orders',
              },
              scheduleTime: now.utc().format('HH:mm:ss'),
              isDefaultConfig: false,
            });

            integrations.push(integration);

            Integrations.createIntegrationViaApi(integration);
          });
        });
        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
        });
        // Need to wait while first job will be runing
        cy.wait(70000);
        cy.createTempUser([
          permissions.uiOrdersView.gui,
          permissions.uiOrdersCreate.gui,
          permissions.uiOrdersEdit.gui,
          permissions.uiOrdersApprovePurchaseOrders.gui,
          permissions.uiOrganizationsViewEditCreate.gui,
          permissions.uiOrganizationsView.gui,
          permissions.uiExportOrders.gui,
          permissions.exportManagerAll.gui,
          permissions.exportManagerDownloadAndResendFiles.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350402 Verify that an Order is exported to a definite Vendors Account specified in one of several Integration configurations (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C350402'] },
        () => {
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.createPOLineViaActions();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
          OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
            'Purchase',
            location.name,
            `${organization.accounts[0].name} (${organization.accounts[0].accountNo})`,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          TopMenuNavigation.navigateToApp('Export manager');
          ExportManagerSearchPane.selectOrganizationsSearch();

          const firstIntegrationName =
            integrations[0].exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
          const secondIntegrationName =
            integrations[1].exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;

          ExportManagerSearchPane.selectExportMethod(firstIntegrationName);
          ExportManagerSearchPane.selectJobByIntegrationInList(firstIntegrationName);
          ExportManagerSearchPane.rerunJob();
          cy.reload();
          ExportManagerSearchPane.verifyResult('Successful');
          ExportManagerSearchPane.selectJob('Successful');
          ExportManagerSearchPane.downloadJob();
          ExportManagerSearchPane.resetAll();
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.selectExportMethod(secondIntegrationName);
          ExportManagerSearchPane.selectJobByIntegrationInList(secondIntegrationName);
          ExportManagerSearchPane.rerunJob();
          cy.reload();
          ExportManagerSearchPane.verifyResult('Failed');
        },
      );
    });
  });
});
