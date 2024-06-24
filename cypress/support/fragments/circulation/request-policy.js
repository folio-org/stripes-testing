import uuid from 'uuid';
import { Button, Link, Pane, TextArea, TextField } from '../../../../interactors';
import { REQUEST_TYPES } from '../../constants';
import { getTestEntityValue } from '../../utils/stringTools';

const actionsButton = Button('Actions');
const actionsEditButton = Button({ id: 'dropdown-clickable-edit-item' });
const nameTextField = TextField({ id: 'request_policy_name' });
const descriptionTextField = TextArea({ id: 'request_policy_description' });
const saveAndCloseButton = Button({ id: 'footer-save-entity' });

export const defaultRequestPolicy = {
  requestTypes: [REQUEST_TYPES.HOLD],
  name: getTestEntityValue(),
  description: 'description',
  id: uuid(),
};

export default {
  waitLoading() {
    cy.expect(Pane('Request policies').exists());
    cy.wait(1000);
  },

  selectRequestPolicy(requestPolicy) {
    cy.do(Link(requestPolicy).click());
  },

  editRequestPolicy() {
    cy.do(actionsButton.click());
    cy.do(actionsEditButton.click());
    cy.wait(1000);
  },

  setName(name) {
    cy.do(nameTextField.fillIn(name));
    cy.wait(1000);
  },

  setDescription(description) {
    cy.do(descriptionTextField.fillIn(description));
    cy.wait(1000);
  },

  save() {
    cy.do(saveAndCloseButton.click());
  },

  createViaApi(requestBody = defaultRequestPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'request-policy-storage/request-policies',
        body: requestBody,
      })
      .then(({ body }) => {
        Cypress.env('requestPolicy', body);
        return body;
      });
  },
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `request-policy-storage/request-policies/${id}`,
    });
  },
};
