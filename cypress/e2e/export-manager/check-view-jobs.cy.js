import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
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
      const firstIntegrationName = `FirstIntegrationName${getRandomPostfix()}`;
      const secondIntegrationName = `SecondIntegrationName${getRandomPostfix()}`;
      const integartionDescription1 = 'Test Integation descripton1';
      const integartionDescription2 = 'Test Integation descripton2';
      const vendorEDICodeFor1Integration = getRandomPostfix();
      const libraryEDICodeFor1Integration = getRandomPostfix();
      const vendorEDICodeFor2Integration = getRandomPostfix();
      const libraryEDICodeFor2Integration = getRandomPostfix();
      const UTCTime = DateTools.getUTCDateForScheduling();
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
        cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
        Organizations.searchByParameters('Name', organization.name);
        Organizations.checkSearchResults(organization);
        Organizations.selectOrganization(organization.name);
        Organizations.addIntegration();
        Organizations.fillIntegrationInformation(
          firstIntegrationName,
          integartionDescription1,
          vendorEDICodeFor1Integration,
          libraryEDICodeFor1Integration,
          organization.accounts[0].accountNo,
          'Purchase',
          UTCTime,
        );
        Organizations.addIntegration();
        cy.wait(2000);
        Organizations.fillIntegrationInformation(
          secondIntegrationName,
          integartionDescription2,
          vendorEDICodeFor2Integration,
          libraryEDICodeFor2Integration,
          organization.accounts[1].accountNo,
          'Purchase At Vendor System',
          UTCTime,
        );

        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
        });
        // Need to wait while first job will be runing
        cy.wait(60000);
        cy.createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersApprovePurchaseOrders.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiExportOrders.gui,
          Permissions.exportManagerAll.gui,
          Permissions.exportManagerDownloadAndResendFiles.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });

      after(() => {
        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.unOpenOrder();
        // Need to wait until the order is opened before deleting it
        cy.wait(2000);
        Orders.deleteOrderViaApi(order.id);

        Organizations.deleteOrganizationViaApi(organization.id);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C347885 Check view for jobs on Export Manager page (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C347885'] },
        () => {
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.createPOLineViaActions();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
          OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.searchByFailed();
          ExportManagerSearchPane.selectJobByIntegrationInList(firstIntegrationName);
          ExportManagerSearchPane.verifyThirdPaneExportJobExist();
          ExportManagerSearchPane.rerunJob();
          ExportManagerSearchPane.closeExportJobPane();
          ExportManagerSearchPane.resetAll();
          cy.reload();
          ExportManagerSearchPane.searchBySuccessful();
          ExportManagerSearchPane.selectJobByIntegrationInList(firstIntegrationName);
          ExportManagerSearchPane.verifyThirdPaneExportJobExist();
        },
      );
    });
  });
});
