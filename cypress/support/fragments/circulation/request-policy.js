import uuid from 'uuid';
import {
  Button,
  Checkbox,
  including,
  KeyValue,
  Link,
  Pane,
  TextArea,
  TextField,
} from '../../../../interactors';
import { REQUEST_TYPES } from '../../constants';
import { getTestEntityValue } from '../../utils/stringTools';

const actionsButton = Button('Actions');
const actionsEditButton = Button({ id: 'dropdown-clickable-edit-item' });
const actionsDuplicateButton = Button({ id: 'dropdown-clickable-duplicate-item' });
const actionsDeleteButton = Button({ id: 'dropdown-clickable-delete-item' });
const newPolicyButton = Button({ id: 'clickable-create-entry' });
const confirmDeleteButton = Button({ id: 'clickable-delete-item-confirmation-confirm' });
const nameTextField = TextField({ id: 'request_policy_name' });
const descriptionTextField = TextArea({ id: 'request_policy_description' });
const saveAndCloseButton = Button({ id: 'footer-save-entity' });
const holdCheckbox = Checkbox({ id: 'hold-checkbox' });
const pageCheckbox = Checkbox({ id: 'page-checkbox' });
const recallCheckbox = Checkbox({ id: 'recall-checkbox' });

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

  clickNewPolicy() {
    cy.do(newPolicyButton.click());
    cy.wait(1000);
  },

  duplicateRequestPolicy() {
    cy.do(actionsButton.click());
    cy.do(actionsDuplicateButton.click());
    cy.wait(1000);
  },

  fillRequestPolicy(requestPolicy) {
    cy.wait(1000);
    this.setName(requestPolicy.name);
    this.setDescription(requestPolicy.description);
    cy.do(
      requestPolicy.holdable ? holdCheckbox.checkIfNotSelected() : holdCheckbox.uncheckIfSelected(),
    );
    cy.do(
      requestPolicy.pageable ? pageCheckbox.checkIfNotSelected() : pageCheckbox.uncheckIfSelected(),
    );
    cy.do(
      requestPolicy.recallable
        ? recallCheckbox.checkIfNotSelected()
        : recallCheckbox.uncheckIfSelected(),
    );
  },

  selectRequestPolicy(requestPolicy) {
    cy.do(Link(requestPolicy).click());
  },

  verifyRequestPolicy(requestPolicy) {
    if (requestPolicy.name) {
      this.verifyKeyValue('Request policy name', requestPolicy.name);
    }
    if (requestPolicy.description) {
      this.verifyKeyValue('Description', requestPolicy.description);
    }

    const allowedRequestTypes = [
      requestPolicy.holdable ? 'Hold' : null,
      requestPolicy.pageable ? 'Page' : null,
      requestPolicy.recallable ? 'Recall' : null,
    ].filter(Boolean);
    allowedRequestTypes.forEach((requestType) => {
      cy.expect(KeyValue('Request types allowed', { value: including(requestType) }).exists());
    });
  },

  verifyKeyValue(verifyKey, verifyValue) {
    cy.expect(KeyValue(verifyKey, { value: verifyValue }).exists());
  },

  verifyRequestPolicyInNotInTheList(name) {
    cy.contains(name).should('not.exist');
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

  deleteRequestPolicy() {
    cy.do(actionsButton.click());
    cy.do(actionsDeleteButton.click());
    cy.wait(1000);
    cy.do(confirmDeleteButton.click());
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

  getRequestPolicyViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'request-policy-storage/request-policies',
      })
      .then((response) => {
        return response.body.requestPolicies;
      });
  },

  deleteRequestPolicyByNameViaAPI(name) {
    this.getRequestPolicyViaAPI().then((policies) => {
      const policy = policies.find((p) => p.name === name);
      if (policy !== undefined) {
        this.deleteViaApi(policy.id);
      }
    });
  },
};
