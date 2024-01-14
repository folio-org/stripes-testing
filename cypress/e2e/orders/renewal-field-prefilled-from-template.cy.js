import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_FORMAT_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { OrderDetails, OrderLineDetails, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OpenOrder, OrderTemplates } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const isOpenOrderEnabled = true;
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    orderTemplate: OrderTemplates.getDefaultOrderTemplate({ orderType: 'Ongoing' }),
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      OpenOrder.setOpenOrderValue(isOpenOrderEnabled);
      OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
      Organizations.createOrganizationViaApi(testData.organization);
    });

    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OpenOrder.setOpenOrderValue(false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353575 Renewal note field is prefilled in POL when create order from specific template (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'nonParallel'] },
    () => {
      // Click "Actions" button on "Orders" pane and select "New" option
      const OrderEditForm = Orders.clickCreateNewOrder();

      // Select template name from Precondition in "Template name" dropdown
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);

      // Fill all required fields with valid values and click "Save & close" button
      OrderEditForm.selectVendorByName(testData.organization.name);
      OrderEditForm.clickSaveButton();

      // Click "Actions" button, Select "Add PO line" option
      const OrderLineEditForm = OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkOngoingOrderInformationSection([
        { label: 'Renewal note', conditions: { value: testData.orderTemplate.renewalNote } },
      ]);

      // Fill all required fields with valid values and click "Save & open order" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: `autotest_pol_${testData.organization.erpCode}` },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveAndOpenOrderButton();

      // "Renewal note" field in "Ongoing order information" contains prefilled text from template
      OrderLineDetails.checkOngoingOrderInformationSection([
        { key: 'Renewal note', value: testData.orderTemplate.renewalNote },
      ]);
    },
  );
});
