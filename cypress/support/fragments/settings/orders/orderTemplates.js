import uuid from 'uuid';

import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  HTML,
  Callout,
  including,
  MultiColumnListCell,
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
import OrderLineDetails from '../../orders/orderLineDetails';
import OrderTemplateForm from './orderTemplateForm';

const FUND_RESTRICTION_ERROR = 'Location-restricted fund applied to invalid location';

const templateViewPane = Pane({ id: 'order-settings-order-template-view' });
const templatePaymentTermsSection = templateViewPane.find(Accordion({ id: 'paymentTerms' }));

const actionsButton = Button('Actions');
const deleteModal = Modal('Delete template');
const duplicateModal = Modal('Duplicate template');
const duplicateCancelButton = duplicateModal.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const duplicateSubmitButton = duplicateModal.find(Button('Submit'));

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

  verifyExpandCollapseAllButton({ expanded = false } = {}) {
    const label = expanded ? COMMON_BUTTON_LABELS.COLLAPSE_ALL : COMMON_BUTTON_LABELS.EXPAND_ALL;

    cy.expect(templateViewPane.find(Button(label)).has({ disabled: false }));
  },

  openDuplicateModal() {
    cy.do([actionsButton.click(), DropdownMenu().find(Button('Duplicate')).click()]);
    cy.expect(duplicateModal.exists());
  },

  verifyDuplicateModalContent() {
    cy.expect([
      duplicateModal.has({
        message: including('Are you sure you want to duplicate the template?'),
      }),
      duplicateCancelButton.has({ disabled: false }),
      duplicateSubmitButton.has({ disabled: false, className: including('primary') }),
    ]);
  },

  cancelDuplicateModal() {
    cy.do(duplicateCancelButton.click());
    cy.expect([duplicateModal.absent(), templateViewPane.exists()]);
  },

  submitDuplicateModal() {
    cy.do(duplicateSubmitButton.click());
    InteractorsTools.checkCalloutMessage('The template was successfully duplicated');
  },

  duplicateTemplate() {
    this.openDuplicateModal();
    this.submitDuplicateModal();
  },

  // fields: [{ key, value, checkbox }]; fundDistribution: fund names shown in "Fund distribution"
  checkTemplateViewDetails({ fields = [], fundDistribution = [] } = {}) {
    OrderLineDetails.checkSectionData({ details: fields, section: templateViewPane });
    fundDistribution.forEach((fundName) => {
      cy.expect(
        templateViewPane
          .find(MultiColumnListCell({ column: 'Fund', content: including(fundName) }))
          .exists(),
      );
    });
  },

  getOrderTemplateByNameViaApi(templateName) {
    return (
      cy
        .okapiRequest({
          path: 'orders/order-templates',
          searchParams: { query: `templateName=="${templateName}"`, limit: 1 },
          isDefaultSearchParamsRequired: false,
        })
        // null, not undefined: a .then returning undefined would yield the whole response instead
        .then(({ body }) => body.orderTemplates?.[0] ?? null)
    );
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
