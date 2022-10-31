import {
  TextField,
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell
} from '../../../../../interactors';

export default {
  createMarcFieldProtectionViaApi:(fieldBody) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'field-protection-settings/marc',
      body: fieldBody,
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      return body;
    });
  },

  deleteMarcFieldProtectionViaApi:(id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `field-protection-settings/marc/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  getListOfMarcFieldProtectionViaApi:(searchParams) => {
    return cy.okapiRequest({ method: 'GET',
      path: 'field-protection-settings/marc',
      searchParams,
      isDefaultSearchParamsRequired: false })
      .then(({ body }) => {
        return body.marcFieldProtectionSettings;
      });
  },

  createNewMarcFieldProtection:() => {
    cy.do(Pane({ id:'controlled-vocab-pane' }).find(Button('+ New')).click());
  },

  fillMarcFieldProtection:(fieldNumber) => {
    cy.do(TextField({ name:'items[0].field' }).fillIn(fieldNumber));
    cy.do(Button('Save').click());
  },

  currentListOfProtectedMarcFieldsIsPresented:() => {
    cy.expect(MultiColumnList({ id:'editList-marc-field-protection' }).exists());
  },

  checkFieldProtectionIsCreated:() => {
    cy.expect(MultiColumnList({ id:'editList-marc-field-protection' }).find(MultiColumnListCell({ content: '856' })).exists());
  }
};
