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
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

Cypress.on('uncaught:exception', () => false);

describe('orders: Edifact export', () => {
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
  const UTCTime = DateTools.getUTCDateForScheduling();
  let orderNumber;
  let user;
  let location;
  let servicePointId;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;

        MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
          (mtypes) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            }).then((params) => {
              Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
                organization.id = organizationsResponse;
                order.vendor = organizationsResponse;
                const firstOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 100.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 100.0,
                  },
                  fundDistribution: [],
                  locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: params.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypes.body.id,
                    materialSupplier: organizationsResponse,
                    volumes: [],
                  },
                };
                cy.loginAsAdmin({
                  path: TopMenu.organizationsPath,
                  waiter: Organizations.waitLoading,
                });
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

                cy.createOrderApi(order).then((firstOrderResponse) => {
                  orderNumber = firstOrderResponse.body.poNumber;
                  firstOrderLine.purchaseOrderId = firstOrderResponse.body.id;

                  OrderLines.createOrderLineViaApi(firstOrderLine);
                  Orders.updateOrderViaApi({
                    ...firstOrderResponse.body,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });
            });
          },
        );
      });
    });
    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
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
    Orders.unOpenOrder(orderNumber, true, true);
    cy.wait(6000);
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
    'C350550 NOT exported order DOES NOT display export details (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350550'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.checkAbsentExportDetails();
    },
  );
});
