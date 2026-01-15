import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_FORMAT_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { OrderDetails, OrderLineDetails, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OpenOrder, OrderTemplates } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import { matching } from '../../../interactors';
import OrderStates from '../../support/fragments/orders/orderStates';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const isOpenOrderEnabled = true;
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    orderTemplate: OrderTemplates.getDefaultOrderTemplate({
      additionalProperties: {
        orderType: 'Ongoing',
        checkinItems: false,
        renewalNote: `autotest_renewal_note_${getRandomPostfix()}`,
      },
    }),
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
        authRefresh: true,
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
    { tags: ['extendedPath', 'thunderjet', 'C353575'] },
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
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderOpenedSuccessfully)),
      );
      OrderDetails.openPolDetails(`autotest_pol_${testData.organization.erpCode}`);

      // "Renewal note" field in "Ongoing order information" contains prefilled text from template
      OrderLineDetails.checkOngoingOrderInformationSection([
        { key: 'Renewal note', value: testData.orderTemplate.renewalNote },
      ]);
    },
  );
});
