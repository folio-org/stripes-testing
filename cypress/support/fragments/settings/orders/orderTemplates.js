import { Button, Modal, NavListItem, Pane, PaneContent, SearchField, SelectionOption, TextField } from '../../../../../interactors';
import SearchHelper from '../../finance/financeHelper';

export default {

    waitLoading: () => {
        cy.expect(Pane({ id: 'order-settings-order-templates-list' }).exists());
      },
    
    newTemplate: () => {
    cy.do(Button('New').click());
    },
    
    fillTemplateInformationWithAcquisitionMethod: (templateName,organizationName,acquisitionMethod) => {
        cy.do([
            TextField({ name: 'templateName'}).fillIn(templateName),
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
        ]);
    },

    saveTemplate : () => {
        cy.do(Button({ id: 'save-order-template-button' }).click());
    },

    checkTemplateCreated: (templateName) => {
        cy.expect(PaneContent({ id: 'order-settings-order-templates-list-content'}).find(NavListItem(templateName)).exists());
    }
};
