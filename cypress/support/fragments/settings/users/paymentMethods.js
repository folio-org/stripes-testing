import { not } from 'bigtest';
import uuid from 'uuid';

import {
  Button,
  Pane,
  Select,
  TextField,
  including,
  TextFieldIcon,
  MultiColumnListRow,
  MultiColumnListCell,
  Modal,
  HTML,
  MultiColumnList,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const rootPane = Pane({ id: 'controlled-vocab-pane' });
const ownerSelect = rootPane.find(Select({ id: 'select-owner' }));

const newButton = rootPane.find(Button({ id: 'clickable-add-settings-payments' }));
const saveButton = rootPane.find(Button({ id: including('clickable-save-settings-payments') }));
const nameTextField = rootPane.find(TextField({ placeholder: 'nameMethod' }));

const save = () => {
  cy.do(saveButton.click());
};
const defaultPaymentMethod = { name: `testPaymentName${getRandomPostfix()}` };

const fillRequiredFields = (paymentMethod = defaultPaymentMethod) => cy.do(nameTextField.fillIn(paymentMethod.name));

const findRowIndex = (paymentMethodName) => cy.then(() => rootPane.find(MultiColumnListCell(paymentMethodName)).row());

export default {
  defaultPaymentMethod,
  save,
  waitLoading: () => {
    cy.expect(newButton.exists());
  },
  checkControls: () => {
    cy.expect([
      ownerSelect.exists(),
      newButton.exists(),
      rootPane.find(Select({ id: 'select-owner' })).has({ value: not('') }),
    ]);
  },
  checkPaymentMethodInTable: (ownerName, paymentMethodName) => {
    cy.do(ownerSelect.choose(ownerName));
    cy.expect(
      MultiColumnList('editList-settings-payments')
        .find(MultiColumnListCell(paymentMethodName))
        .exists(),
    );
  },
  pressNew: () => {
    cy.do(newButton.click());
  },
  checkFields: () => {
    save();
    // message
    cy.expect(nameTextField.has({ error: 'Please fill this in to continue' }));
    // red icon
    cy.expect(TextFieldIcon().has({ id: including('validation-error') }));
  },
  fillRequiredFields,
  checkCreatedRecord: (paymentMethod = defaultPaymentMethod) => {
    cy.expect(rootPane.find(MultiColumnListCell(paymentMethod.name)).exists());
  },
  deleteViaApi: (paymentMethodId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `payments/${paymentMethodId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  delete: (paymentMethodName) => {
    findRowIndex(paymentMethodName).then((rowNumber) => {
      const rowIndex = `row-${rowNumber - 2}`;
      cy.do(
        rootPane
          .find(MultiColumnListRow({ rowIndexInParent: rowIndex }))
          .find(Button({ icon: 'trash' }))
          .click(),
      );
      cy.do(
        Modal('Delete Payment method')
          .find(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }))
          .click(),
      );
      cy.expect(rootPane.find(HTML(including(paymentMethodName))).absent());
    });
  },
  edit: (initialPaymentMethodName, updatedPaymentMethod) => {
    findRowIndex(initialPaymentMethodName).then((rowNumber) => {
      cy.do(
        rootPane
          .find(MultiColumnListRow({ rowIndexInParent: `row-${rowNumber - 2}` }))
          .find(Button({ icon: 'edit' }))
          .click(),
      );
      fillRequiredFields(updatedPaymentMethod);
      save();
    });
  },
  createViaApi: (ownerId) => cy
    .okapiRequest({
      method: 'POST',
      path: 'payments',
      body: {
        allowedRefundMethod: true,
        nameMethod: `autotestPaymentMethod${getRandomPostfix()}`,
        ownerId,
        id: uuid(),
      },
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => ({ name: response.body.nameMethod, id: response.body.id })),
};
