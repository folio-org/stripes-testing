import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../../support/utils';
import {
  ORDER_SEARCH_OPTIONS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../../support/constants/orders/order';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderEditForm from '../../../support/fragments/orders/orderEditForm';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

describe('Settings | Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    ORG: 'org',
    ORDER: 'order',
    TEMPLATE_ID: 'templateId',
    USER: 'user',
  };

  const testData = {
    templateName: `AT_Template_${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    // Precondition 1: "One-time" order in "Pending" status without PO lines has been created
    flow
      .step((currentFlow) => {
        return Organizations.createOrganizationViaApi(NewOrganization.defaultUiOrganizations).then(
          (orgId) => currentFlow.set(R.ORG, { id: orgId }, () => Organizations.deleteOrganizationViaApi(orgId)),
        );
      })
      .step((currentFlow) => {
        const { org } = currentFlow.ctx();
        return Orders.createOrderViaApi({
          ...NewOrder.defaultOneTimeOrder,
          vendor: org.id,
        }).then((order) => currentFlow.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false)));
      })
      // Precondition 2: Authorized user with following capability sets is logged in:
      //   data - UI-Orders Orders - edit, create
      //   settings - UI-Orders Settings Order-Templates - create
      .step((currentFlow) => {
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
          ])
          .then((userProperties) => currentFlow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId)));
      })
      // Precondition 3: A user is in "Settings" → "Orders" → "Order templates"
      .step((currentFlow) => {
        const { user } = currentFlow.ctx();
        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1404901 Multi-year prepayment not available for one-time orders (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1404901'] },
    () => {
      const checkTemplateFormOngoingSectionsAbsent = () => {
        OrderTemplateForm.checkPolOngoingOrderSectionAbsent();
        OrderTemplateForm.checkPaymentTermsSectionAbsent();
      };
      const checkTemplateFormOngoingSectionsPresent = () => {
        OrderTemplateForm.checkPolOngoingOrderSectionPresent();
        OrderTemplateForm.checkPaymentTermsSectionPresent();
      };
      const checkTemplateViewOngoingSectionsAbsent = () => {
        OrderTemplates.checkPolOngoingOrderSectionAbsent();
        OrderTemplates.checkPaymentTermsSectionAbsent();
      };
      const checkPolLineOngoingSectionsAbsent = () => {
        OrderLineEditForm.checkOngoingOrderSectionAbsent();
        OrderLineEditForm.checkPaymentTermsSectionAbsent();
      };
      cy.intercept('POST', '**/orders/order-templates').as('templateCreated');

      cy.log('Step 1. Click "New" button on the "Order templates" pane');
      OrderTemplates.clickNewOrderTemplateButton();
      OrderTemplateForm.waitLoading();
      checkTemplateFormOngoingSectionsAbsent();

      cy.log('Step 2. Select "One-time" option in the "Order type" field');
      OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      checkTemplateFormOngoingSectionsAbsent();

      cy.log('Step 3. Select "Ongoing" option in the "Order type" field');
      OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONGOING });
      checkTemplateFormOngoingSectionsPresent();

      cy.log('Step 4. Select "One-time" option in the "Order type" field');
      OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      checkTemplateFormOngoingSectionsAbsent();

      cy.log('Step 5. Fill in the "Name" field; Click "Save" button');
      OrderTemplateForm.fillInfoSectionFields({ templateName: testData.templateName });
      OrderTemplateForm.clickSaveButton();

      cy.wait('@templateCreated').then(({ response }) => {
        flow.set(R.TEMPLATE_ID, response.body.id, () => OrderTemplates.deleteOrderTemplateViaApi(response.body.id));
      });

      OrderTemplates.waitLoading();

      cy.log('Step 6. Click on the just created order template');
      OrderTemplates.selectTemplate(testData.templateName);
      checkTemplateViewOngoingSectionsAbsent();

      cy.log(
        'Step 7. Navigate to the order from Preconditions; Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      const { order } = flow.ctx();
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
          OrderLines.selectOrders();
        },
      });
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
        trigger: () => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order.poNumber),
      });
      Orders.selectFromResultsList(order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      checkPolLineOngoingSectionsAbsent();

      cy.log(
        'Step 8. Close "Add PO line" page; Click "Actions" button; Select "Edit" option; Select "Ongoing" option in the "Order type" dropdown; Click "Save & close" button',
      );
      OrderLineEditForm.clickCancelButton(true);
      AreYouSureModal.dismissIfOpen();
      OrderLineEditForm.assertFormClosed();
      OrderDetails.openOrderEditForm();
      OrderEditForm.waitLoading();
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONGOING });
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONGOING }],
      });

      cy.log(
        'Step 9. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkMultiYearPrepaymentUnchecked();
      OrderLineEditForm.checkPaymentTermsCollapsed();

      cy.log(
        'Step 10. Close "Add PO line" page; Click "Actions" button; Select "Edit" option; Select "One-time" option in the "Order type" dropdown; Click "Save & close" button',
      );
      OrderLineEditForm.clickCancelButton(true);
      AreYouSureModal.dismissIfOpen();
      OrderLineEditForm.assertFormClosed();
      OrderDetails.openOrderEditForm();
      OrderEditForm.waitLoading();
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        orderInformation: [
          { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONE_TIME },
        ],
      });

      cy.log(
        'Step 11. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      checkPolLineOngoingSectionsAbsent();
      OrderLineEditForm.clickCancelButton(true);
      AreYouSureModal.dismissIfOpen();
      OrderLineEditForm.assertFormClosed();
    },
  );
});
