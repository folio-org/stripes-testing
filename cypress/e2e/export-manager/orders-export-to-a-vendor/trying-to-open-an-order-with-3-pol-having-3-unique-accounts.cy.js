import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Integrations from '../../../support/fragments/organizations/integrations/integrations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
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
          paymentMethod: 'EFT',
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
          paymentMethod: 'EFT',
        },
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout3',
          notes: '',
          paymentMethod: 'EFT',
        },
      ],
    };
    let user;
    let location;
    let orderNumber;
    let acqMethodId;

    before(() => {
      cy.getAdminToken();
      ServicePoints.getViaApi()
        .then((servicePoint) => {
          return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id));
        })
        .then((res) => {
          location = res;
        });

      Organizations.createOrganizationViaApi(organization)
        .then((orgId) => {
          organization.id = orgId;
          order.vendor = orgId;
          return cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          });
        })
        .then(({ body: { acquisitionMethods } }) => {
          const acqMethod = acquisitionMethods.find(
            ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
          );
          acqMethodId = acqMethod.id;

          const integrationPromises = organization.accounts.map((account) => Integrations.createIntegrationViaApi(
            Integrations.getDefaultIntegration({
              vendorId: organization.id,
              acqMethodId: acqMethod.id,
              accountNoList: [account.accountNo],
            }),
          ));
          return Cypress.Promise.all(integrationPromises);
        })
        .then(() => {
          OrderLinesLimit.setPOLLimitViaApi(3);
          return cy.createOrderApi(order);
        })
        .then((response) => {
          order.id = response.body.id;
          orderNumber = response.body.poNumber;

          const polPromises = organization.accounts.map((account) => OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: acqMethodId,
              automaticExport: true,
              orderFormat: 'Electronic Resource',
              specialLocationId: location.id,
              vendorAccount: account.accountNo,
            }),
          ));
          return Cypress.Promise.all(polPromises);
        })
        .then(() => {
          return cy.createTempUser([permissions.uiOrdersEdit.gui]);
        })
        .then((userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      if (order.id) Orders.deleteOrderViaApi(order.id);
      OrderLinesLimit.setPOLLimitViaApi(1);
      if (organization.id) Organizations.deleteOrganizationViaApi(organization.id);
      if (location) {
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
      }
      if (user) Users.deleteViaApi(user.userId);
    });

    it(
      'C350433 Check if an User is alerted trying to open an Order with 3 POL, having 3 unique accounts (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C350433'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.checkModalDifferentAccountNumbers(3);
        Orders.checkOrderStatus('Pending');
      },
    );
  });
});
