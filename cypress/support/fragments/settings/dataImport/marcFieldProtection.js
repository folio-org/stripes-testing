import {
  TextField,
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell
} from '../../../../../interactors';

const editList = MultiColumnList({ id:'editList-marc-field-protection' });
const newButton = Button('+ New');
const saveButton = Button('Save');

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

  createNewMarcFieldProtection:() => cy.do(Pane({ id:'controlled-vocab-pane' }).find(newButton).click()),

  fillMarcFieldProtection:(fieldNumber) => {
    cy.do(TextField({ name:'items[0].field' }).fillIn(fieldNumber));
    cy.do(saveButton.click());
  },

  currentListOfProtectedMarcFieldsIsPresented:() => cy.expect(editList.exists()),
  checkFieldProtectionIsCreated:() => cy.expect(editList.find(MultiColumnListCell({ content: '856' })).exists())
};
