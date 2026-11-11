import uuid from 'uuid';
import {
  Button,
  Checkbox,
  EditableListRow,
  MultiColumnListCell,
  Pane,
  TextField,
  Modal,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';

const acquisitionMethodPane = Pane({ id: 'controlled-vocab-pane' });
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const editIconButton = Button({ icon: 'edit' });
const trashIconButton = Button({ icon: 'trash' });
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}
function withinAcquisitionMethodRow(acquisitionMethodName, callback) {
  cy.do(
    MultiColumnListCell({ content: acquisitionMethodName }).perform((element) => {
      const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
      callback(getEditableListRow(rowNumber));
    }),
  );
}

export default {
  defaultAcquisitionMethod: {
    id: uuid(),
    value: `AU_name_${getRandomPostfix()}`,
  },
  createNewAcquisitionMethodViaAPI: (acquisitionMethod) =>
    cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/acquisition-methods',
        body: acquisitionMethod,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body),

  deleteAcquisitionMethodViaAPI: (id, { failOnStatusCode } = {}) =>
    cy.okapiRequest({
      method: 'DELETE',
      path: `orders/acquisition-methods/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    }),

  waitLoading: () => {
    cy.expect(acquisitionMethodPane.exists());
  },

  newAcquisitionMethod: () => {
    cy.do(Button({ id: 'clickable-add-acquisition-methods' }).click());
  },

  fillAcquisitionMethodName: (acquisitionMethodName) => {
    cy.do([
      TextField({ name: 'items[0].value' }).fillIn(acquisitionMethodName),
      acquisitionMethodPane.find(saveButton).click(),
    ]);
  },

  checkcreatedAM: (acquisitionMethodName) => {
    cy.expect(MultiColumnListCell(acquisitionMethodName).exists());
  },

  editAcquisitionMethod: (acquisitionMethodName, newAcquisitionMethodName) => {
    cy.do(
      MultiColumnListCell({ content: acquisitionMethodName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
      }),
    );
    cy.do([
      TextField().fillIn(`${newAcquisitionMethodName}`),
      acquisitionMethodPane.find(saveButton).click(),
    ]);
  },

  deleteAcquisitionMethod: (acquisitionMethodName, shouldDelete = true) => {
    cy.do(
      MultiColumnListCell({ content: acquisitionMethodName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(trashIconButton).click());
      }),
    );
    const confirmationModal = Modal('Delete acquisition method');
    cy.expect(
      confirmationModal.has({
        message: `The acquisition method ${acquisitionMethodName} will be deleted.`,
      }),
    );

    if (shouldDelete) {
      cy.do(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click());
      InteractorsTools.checkCalloutMessage(
        `The acquisition method ${acquisitionMethodName} was successfully deleted`,
      );
      cy.expect(MultiColumnListCell(acquisitionMethodName).absent());
    } else {
      cy.do(confirmationModal.find(Button('Delete')).click());
      const cannotDeleteModal = Modal('Cannot delete the acquisition method');
      cy.expect(
        cannotDeleteModal.has({
          message:
            'This acquisition method cannot be deleted, as it is in use by one or more records.',
        }),
      );
      cy.do(cannotDeleteModal.find(Button('Okay')).click());
      cy.expect(MultiColumnListCell(acquisitionMethodName).exists());
    }
  },
  checkSystemAcquisitionMethodCannotBeDeleted: (acquisitionMethodName) => {
    withinAcquisitionMethodRow(acquisitionMethodName, (row) => {
      cy.expect([row.find(editIconButton).exists(), row.find(trashIconButton).absent()]);
    });
  },

  clickEditAcquisitionMethod: (acquisitionMethodName) => {
    withinAcquisitionMethodRow(acquisitionMethodName, (row) => {
      cy.do(row.find(editIconButton).click());
    });
  },

  checkSystemAcquisitionMethodEditMode: (acquisitionMethodName) => {
    withinAcquisitionMethodRow(acquisitionMethodName, (row) => {
      cy.expect([
        row.find(MultiColumnListCell({ content: acquisitionMethodName })).exists(),
        row.find(TextField()).absent(),
        row.find(Checkbox({ disabled: false })).exists(),
        row.find(cancelButton).has({ disabled: false }),
        row.find(saveButton).has({ disabled: true }),
      ]);
    });
  },

  clickCancelEditAcquisitionMethod: (acquisitionMethodName) => {
    withinAcquisitionMethodRow(acquisitionMethodName, (row) => {
      cy.do(row.find(cancelButton).click());
    });
  },

  checkAcquisitionMethodRowInViewMode: (acquisitionMethodName, { isDeprecated = false } = {}) => {
    withinAcquisitionMethodRow(acquisitionMethodName, (row) => {
      cy.expect([
        row.find(Checkbox({ disabled: true, checked: isDeprecated })).exists(),
        row.find(editIconButton).exists(),
        row.find(cancelButton).absent(),
        row.find(saveButton).absent(),
      ]);
    });
  },
};
