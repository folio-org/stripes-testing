import uuid from 'uuid';
import {
  Button,
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
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  defaultAcquisitionMethod: {
    id: uuid(),
    value: `AU_name_${getRandomPostfix()}`,
  },
  createNewAcquisitionMethodViaAPI: (acquisitionMethod) => cy
    .okapiRequest({
      method: 'POST',
      path: 'orders/acquisition-methods',
      body: acquisitionMethod,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body),

  deleteAcquisitionMethodViaAPI: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `orders/acquisition-methods/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  waitLoading: () => {
    cy.expect(acquisitionMethodPane.exists());
  },

  newAcquisitionMethod: () => {
    cy.do(Button({ id: 'clickable-add-acquisition-methods' }).click());
  },

  fillAcquisitionMethodName: (AMName) => {
    cy.do([
      TextField({ name: 'items[0].value' }).fillIn(AMName),
      acquisitionMethodPane.find(saveButton).click(),
    ]);
  },

  checkcreatedAM: (AMName) => {
    cy.expect(MultiColumnListCell(AMName).exists());
  },

  editAcquisitionMethod: (AMName, newAMName) => {
    cy.do(
      MultiColumnListCell({ content: AMName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
    cy.do([TextField().fillIn(`${newAMName}`), acquisitionMethodPane.find(saveButton).click()]);
  },

  deleteAcquisitionMethod: (AMName, shouldDelete = true) => {
    cy.do(
      MultiColumnListCell({ content: AMName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    const confirmationModal = Modal('Delete acquisition method');
    cy.expect(
      confirmationModal.has({ message: `The acquisition method ${AMName} will be deleted.` }),
    );

    if (shouldDelete) {
      cy.do(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click());
      InteractorsTools.checkCalloutMessage(
        `The acquisition method ${AMName} was successfully deleted`,
      );
      cy.expect(MultiColumnListCell(AMName).absent());
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
      cy.expect(MultiColumnListCell(AMName).exists());
    }
  },
  checkSystemAcquisitionMethodCannotBeDeleted: (AMName) => {
    cy.do(
      MultiColumnListCell({ content: AMName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.expect([
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .absent(),
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .absent(),
        ]);
      }),
    );
  },
};
