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
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
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

    let orderNumber;
    let user;
    let effectiveLocationServicePoint;
    let location;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
        effectiveLocationServicePoint = servicePoint;
        NewLocation.createViaApi(
          NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
        ).then((locationResponse) => {
          location = locationResponse;
          Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
            organization.id = organizationsResponse;
            order.vendor = organizationsResponse;
          });
          cy.createOrderApi(order).then((response) => {
            orderNumber = response.body.poNumber;
          });
        });
      });

      cy.createTempUser([
        permissions.uiOrdersCreate.gui,
        permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(1);
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
      'C668 Change the purchase order lines limit, then create POs with PO Lines of (PO Line limit + 1), to see how the order app behaves (thunderjet)',
      { tags: ['criticalPathFlaky', 'thunderjet', 'C668'] },
      () => {
        OrderLinesLimit.setPOLLimitViaApi(2);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 20);
        OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
          'Purchase',
          location.name,
          '4',
        );
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 40);
        OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
          'Purchase',
          location.name,
          '4',
        );
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        Orders.checkPurchaseOrderLineLimitReachedModal();
      },
    );
  });
});
