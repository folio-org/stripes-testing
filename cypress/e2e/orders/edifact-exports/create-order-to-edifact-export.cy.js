import permissions from '../../../support/dictionary/permissions';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const order = { ...NewOrder.defaultOneTimeOrder };
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
      const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
      const integartionDescription1 = 'Test Integation descripton1';
      const vendorEDICodeFor1Integration = getRandomPostfix();
      const libraryEDICodeFor1Integration = getRandomPostfix();

      let user;
      let location;
      let servicePointId;
      const UTCTime = DateTools.getUTCDateForScheduling();

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
          order.vendor = organization.name;
          order.orderType = 'One-time';
        });
        cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
        Organizations.searchByParameters('Name', organization.name);
        Organizations.checkSearchResults(organization);
        Organizations.selectOrganization(organization.name);
        Organizations.addIntegration();
        Organizations.fillIntegrationInformation(
          integrationName1,
          integartionDescription1,
          vendorEDICodeFor1Integration,
          libraryEDICodeFor1Integration,
          organization.accounts[0].accountNo,
          'Purchase',
          UTCTime,
        );

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
        'C350395 Verify that Orders can be created for the selected Vendors EDIFACT export (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C350395'] },
        () => {
          cy.visit(TopMenu.ordersPath);
          Orders.createOrder(order, true, false).then((orderId) => {
            order.id = orderId;
            Orders.createPOLineViaActions();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
            OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
              'Purchase',
              location.name,
              '3',
            );
            OrderLines.backToEditingOrder();
          });
        },
      );
    });
  });
});
