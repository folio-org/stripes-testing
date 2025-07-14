import uuid from 'uuid';

import { Button, DropdownMenu, NavListItem, Pane, PaneContent } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import getRandomPostfix from '../../../utils/stringTools';
import OrderTemplateForm from './orderTemplateForm';

const actionsButton = Button('Actions');

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

  deleteTemplate(templateName) {
    cy.do([
      NavListItem(templateName).click(),
      actionsButton.click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-order-template-modal-confirm' }).click(),
    ]);
    InteractorsTools.checkCalloutMessage('The template was deleted');
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
  getDefaultOrderTemplate({
    orderType = 'One-time',
    renewalNote = `autotest_renewal_note_${getRandomPostfix()}`,
  } = {}) {
    return {
      isPackage: false,
      templateName: `autotest_template_name_${getRandomPostfix()}`,
      templateCode: getRandomPostfix(),
      orderType,
      renewalNote,
      id: uuid(),
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
  deleteOrderTemplateViaApi(orderTemplateId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/order-templates/${orderTemplateId}`,
    });
  },
};
