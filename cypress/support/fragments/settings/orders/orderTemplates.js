import {
  Button,
  DropdownMenu,
  Modal,
  NavListItem,
  Pane,
  PaneContent,
  SearchField,
  Select,
  SelectionOption,
  TextField,
} from '../../../../../interactors';
import SearchHelper from '../../finance/financeHelper';
import InteractorsTools from '../../../utils/interactorsTools';

const saveButton = Button({ id: 'save-order-template-button' });
const actionsButton = Button('Actions');
const templateNameField = TextField({ name: 'templateName' });

export default {
  waitLoading() {
    cy.expect(Pane({ id: 'order-settings-order-templates-list' }).exists());
  },

  newTemplate() {
    cy.do(Button('New').click());
  },

  fillTemplateInformationWithAcquisitionMethod(templateName, organizationName, acquisitionMethod) {
    cy.do([
      templateNameField.fillIn(templateName),
      Button('PO information').click(),
      Button({ id: 'vendor-plugin' }).click(),
      Modal('Select Organization')
        .find(SearchField({ id: 'input-record-search' }))
        .fillIn(organizationName),
      Button('Search').click(),
    ]);
    SearchHelper.selectFromResultsList();
    cy.do([
      Button({ id: 'accordion-toggle-button-lineDetails' }).click(),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption(acquisitionMethod).click(),
      Select({ name: 'orderType' }).choose('One-time'),
    ]);
  },

  saveTemplate() {
    cy.do(saveButton.click());
  },

  checkTemplateCreated(templateName) {
    cy.expect(
      PaneContent({ id: 'order-settings-order-templates-list-content' })
        .find(NavListItem(templateName))
        .exists(),
    );
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
    cy.do([actionsButton.click()]);
    cy.wait(6000);
    cy.do([
      DropdownMenu().find(Button('Edit')).click(),
      templateNameField.fillIn(`${templateName}-edited`),
    ]);
    cy.wait(6000);
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage('The template was saved');
  },
};
