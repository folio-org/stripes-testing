import uuid from 'uuid';

import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  HTML,
  Callout,
  including,
  NavListItem,
  Pane,
  PaneContent,
  Modal,
  Section,
  Card,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_LINE_FORM_LABELS,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import getRandomPostfix from '../../../utils/stringTools';
import OrderTemplateForm from './orderTemplateForm';

const FUND_RESTRICTION_ERROR = 'Location-restricted fund applied to invalid location';

const templateViewPane = Pane({ id: 'order-settings-order-template-view' });
const templatePaymentTermsSection = templateViewPane.find(Accordion({ id: 'paymentTerms' }));

const actionsButton = Button('Actions');
const deleteModal = Modal('Delete template');
const duplicateModal = Modal('Duplicate template');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(Pane({ id: 'order-settings-order-templates-list' }).exists());
  },

  clickNewOrderTemplateButton() {
    cy.do(Button('New').click());
    OrderTemplateForm.waitLoading();

    return OrderTemplateForm;
  },
  fillTemplateInformationWithAcquisitionMethod(templateName, organizationName, acquisitionMethod) {
    OrderTemplateForm.fillOrderTemplateFields({
      templateInformation: { templateName },
      poInformation: { organizationName, orderType: 'One-time' },
      poLineDetails: { acquisitionMethod },
    });
  },

  checkTemplateCreated(templateName) {
    cy.expect(
      PaneContent({ id: 'order-settings-order-templates-list-content' })
        .find(NavListItem(templateName))
        .exists(),
    );
  },

  saveTemplate() {
    OrderTemplateForm.clickSaveButton();
  },

  goToTemplatesFromOrders() {
    cy.do([NavListItem('Orders').click(), NavListItem('Order templates').click()]);
    cy.expect(Pane('Order templates').exists());
  },

  deleteTemplate(templateName, action = 'Confirm') {
    cy.do([actionsButton.click(), Button('Delete').click()]);
    cy.expect(
      deleteModal.has({
        message: 'Are you sure you want to delete the template?',
      }),
    );
    cy.do(deleteModal.find(Button(action)).click());
    if (action === 'Confirm') {
      InteractorsTools.checkCalloutMessage('The template was deleted');
      cy.expect(NavListItem(templateName).absent());
    } else if (action === 'Cancel') {
      cy.expect(deleteModal.absent());
      cy.expect(Pane({ id: 'order-settings-order-template-view' }).exists());
    }
  },

  selectTemplate(templateName) {
    cy.wait(6000);
    cy.do([NavListItem(templateName).click()]);
  },

  closeTemplate() {
    cy.wait(6000);
    cy.do(Button({ icon: 'times' }).click());
  },

  editTemplate(templateName) {
    cy.wait(6000);
    cy.do([actionsButton.click(), DropdownMenu().find(Button('Edit')).click()]);
    cy.wait(6000);

    OrderTemplateForm.fillOrderTemplateFields({ templateInformation: { templateName } });
    cy.wait(6000);

    OrderTemplateForm.clickSaveButton();
  },
  getDefaultOrderTemplate({ isPackage = false, currency = 'USD', additionalProperties = {} }) {
    return {
      cost: {
        currency,
      },
      id: uuid(),
      isPackage,
      templateCode: getRandomPostfix(),
      templateName: `autotest_template_name_${getRandomPostfix()}`,
      ...additionalProperties,
    };
  },
  createOrderTemplateViaApi(orderTemplate) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/order-templates',
        body: orderTemplate,
      })
      .then(({ body }) => body);
  },
  assertPolOngoingOrderSectionAbsent() {
    cy.expect(templateViewPane.find(Section({ id: 'polOngoingOrder' })).absent());
  },

  assertPaymentTermsSectionAbsent() {
    cy.expect(templateViewPane.find(Accordion({ id: 'paymentTerms' })).absent());
  },

  expandAll() {
    cy.do(templateViewPane.find(Button('Expand all')).click());
  },

  // View mode: "Multi-year prepayment" is shown as a checked read-only checkbox
  assertMultiYearPrepaymentChecked() {
    cy.expect(
      templateViewPane
        .find(Checkbox({ labelText: ORDER_LINE_FORM_LABELS.MULTI_YEAR_PREPAYMENT }))
        .has({ checked: true, disabled: true }),
    );
  },

  assertPaymentTermsCardContainsFund(fyCode, fundName) {
    cy.expect(
      templatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .has({ text: including(fundName) }),
    );
  },

  assertPaymentTermsCardShowsNoItems(fyCode) {
    cy.expect(
      templatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(HTML(including('The list contains no items')))
        .exists(),
    );
  },

  duplicateTemplate() {
    cy.do([actionsButton.click(), DropdownMenu().find(Button('Duplicate')).click()]);
    cy.expect(duplicateModal.exists());
    cy.do(duplicateModal.find(Button('Submit')).click());
    InteractorsTools.checkCalloutMessage('The template was successfully duplicated');
  },

  getOrderTemplateByNameViaApi(templateName) {
    return cy
      .okapiRequest({
        path: 'orders/order-templates',
        searchParams: { query: `templateName=="${templateName}"`, limit: 1 },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.orderTemplates?.[0]);
  },
  deleteOrderTemplateViaApi(orderTemplateId, { failOnStatusCode = false } = {}) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/order-templates/${orderTemplateId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    });
  },

  openEditForm() {
    cy.do([actionsButton.click(), DropdownMenu().find(Button(COMMON_BUTTON_LABELS.EDIT)).click()]);
    OrderTemplateForm.waitLoading();
  },

  checkFundRestrictionErrorToastPresent() {
    cy.expect(Callout(including(FUND_RESTRICTION_ERROR)).exists());
  },

  checkFundRestrictionErrorToastAbsent() {
    cy.expect(Callout(including(FUND_RESTRICTION_ERROR)).absent());
  },
};
