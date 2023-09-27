import {
  TextField,
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
} from '../../../../../interactors';

const editList = MultiColumnList({ id: 'editList-marc-field-protection' });
const newButton = Button('+ New');
const saveButton = Button('Save');

const clickNewButton = () => cy.do(Pane({ id: 'controlled-vocab-pane' }).find(newButton).click());
const save = () => {
  cy.do(saveButton.click());
};
const fillMarcFieldProtection = (fieldNumber, subfield = '*', data = '*') => {
  cy.do(TextField({ name: 'items[0].field' }).fillIn(fieldNumber));
  if (subfield) {
    // TODO: redesign to interactors
    cy.get('input[name="items[0].subfield"]').clear().type(subfield);
  }
  if (data) {
    // TODO: redesign to interactors
    cy.get('input[name="items[0].data"]').clear().type(data);
  }
};

export default {
  // actions
  save,
  create: (fieldNumber, subfield = '*', data = '*') => {
    clickNewButton();
    fillMarcFieldProtection(fieldNumber, subfield, data);
    save();
  },
  createViaApi: (fieldBody) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'field-protection-settings/marc',
        body: fieldBody,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `field-protection-settings/marc/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  getListViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'field-protection-settings/marc',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.marcFieldProtectionSettings;
      });
  },

  // checks
  verifyListOfExistingProfilesIsDisplayed: () => cy.expect(editList.exists()),
  verifyFieldProtectionIsCreated: (data) => cy.expect(editList.find(MultiColumnListCell({ content: data })).exists()),
  verifyNewButtonAbsent: () => cy.expect(Pane({ id: 'controlled-vocab-pane' }).find(newButton).absent()),
  verifyNewRow: () => {
    cy.expect([
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(TextField({ name: 'items[0].field' }))
        .has({ value: '' }),
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(TextField({ name: 'items[0].indicator1' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(TextField({ name: 'items[0].indicator2' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(TextField({ name: 'items[0].subfield' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(TextField({ name: 'items[0].data' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: 'row-0' })
        .find(MultiColumnListCell({ content: 'User' }))
        .exists(),
    ]);
  },
};
