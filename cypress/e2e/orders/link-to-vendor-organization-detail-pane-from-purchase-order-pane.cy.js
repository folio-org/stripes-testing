import {
  ORDER_VIEW_FIELD_LABELS,
  ORGANIZATION_DETAILS_ACCORDIONS,
  ORGANIZATION_DETAILS_FIELDS,
} from '../../support/constants';
import {
  NewOrganization,
  OrganizationDetails,
  Organizations,
} from '../../support/fragments/organizations';
import { NewOrder, OrderDetails, Orders } from '../../support/fragments/orders';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const createOrder = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    ).then((order) => {
      testData.order = order;
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([Permissions.uiOrdersView.gui, Permissions.uiOrganizationsView.gui])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization().then(createOrder).then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380616 Link to vendor organization detail pane from purchase order pane (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C380616'] },
    () => {
      // Step 1: Click on the purchase order
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.VENDOR,
          conditions: { value: testData.organization.name },
        },
      ]);

      // Step 2: Click on the organization-vendor name link
      OrderDetails.clickOnOrganizationFromOrder(testData.organization.name);
      OrganizationDetails.waitLoading();
      OrganizationDetails.checkOrganizationDetails([
        { key: ORGANIZATION_DETAILS_FIELDS.NAME, value: testData.organization.name },
      ]);
      OrganizationDetails.checkAccordionsDisplayed(Object.values(ORGANIZATION_DETAILS_ACCORDIONS));
    },
  );
});
