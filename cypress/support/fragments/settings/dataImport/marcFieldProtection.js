import {
  TextField,
  Button,
  Pane,
  MultiColumnList,
  EditableList,
  MultiColumnListCell
} from '../../../../../interactors';

export default {
  createMarcFieldProtectionViaApi: (fieldBody) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'field-protection-settings/marc',
      body: fieldBody,
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      return body;
    });
  },

  deleteMarcFieldProtectionViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `field-protection-settings/marc/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  createNewMarcFieldProtection:() => {
    cy.do(Pane({id:'controlled-vocab-pane-content'}).find(Button('New')).click());
  },

  fillMarcFieldProtection:(fieldNumber) => {
    cy.do(TextField({name:'items[0].field'}).fillIn(fieldNumber));
    cy.do(Button('Save').click());
  },

  currentListOfProtectedMarcFieldsIsPresented:() =>{
    cy.expect(MultiColumnList({id:'editList-marc-field-protection'}).exists());
  },

  checkNewLineIsPresented:() => {
    cy.expect(EditableList().find(MultiColumnListCell({ columnIndex: 5 })).has({ content: 'User' }));
  },

  checkFieldProtectionIsCreated:() => {
    cy.expect(EditableList().find(MultiColumnListCell({ columnIndex: 0 })).has({ content: '856' }));
    cy.expect(EditableList().find(MultiColumnListCell({ columnIndex: 5 })).has({ content: 'User' }));
  }
};
