import { Button, Modal, NavListItem, Pane, PaneContent, SearchField, Select, SelectionOption, TextField } from '../../../../../interactors';
import SearchHelper from '../../finance/financeHelper';
import InteractorsTools from '../../../utils/interactorsTools';

export default {

  waitLoading: () => {
    cy.expect(Pane({ id: 'order-settings-order-templates-list' }).exists());
  },

  newTemplate: () => {
    cy.do(Button('New').click());
  },

  fillTemplateInformationWithAcquisitionMethod: (templateName, organizationName, acquisitionMethod) => {
    cy.do([
      TextField({ name: 'templateName' }).fillIn(templateName),
      Button('PO information').click(),
      Button({ id: 'vendor-plugin' }).click(),
      Modal('Select Organization').find(SearchField({ id: 'input-record-search' })).fillIn(organizationName),
      Button('Search').click(),
    ]);
    SearchHelper.selectFromResultsList();
    cy.do([
      Button({ id: 'accordion-toggle-button-lineDetails' }).click(),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption(acquisitionMethod).click(),
      Select({ name: 'orderType' }).choose('One-time')
    ]);
  },

  saveTemplate : () => {
    cy.do(Button({ id: 'save-order-template-button' }).click());
  },

  checkTemplateCreated: (templateName) => {
    cy.expect(PaneContent({ id: 'order-settings-order-templates-list-content' }).find(NavListItem(templateName)).exists());
  },

  deleteTemplate : (templateName) => {
    cy.do([
      NavListItem(templateName).click(),
      Button('Actions').click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-order-template-modal-confirm' }).click(),
    ]);
    InteractorsTools.checkCalloutMessage('The template was deleted');
  },

  editTemplate : (templateName) => {
    cy.do([
      NavListItem(templateName).click(),
      Button('Actions').click(),
      Button('Edit').click(),
      TextField({ name: 'templateName' }).fillIn(`${templateName}edited`),
      Button({ id: 'save-order-template-button' }).click()
    ]);
    InteractorsTools.checkCalloutMessage('The template was saved');
  },
};
