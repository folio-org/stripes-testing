import {
  Button,
  Pane,
  TextField,
  HTML,
  including,
  Modal,
  MultiColumnListCell,
  EditableListRow
} from '../../../../../interactors';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';

const pane = Pane('Material types');

const checkIsPresented = (materialTypeName) => {
  cy.expect(pane.find(HTML(including(materialTypeName))).exists());
};

const checkIsDeleted = (newMaterialTypeName) => {
  cy.expect(pane.find(HTML(including(newMaterialTypeName))).absent());
};

const verifyMessageOfDeteted = (newMaterialTypeName) => {
  InteractorsTools.checkCalloutMessage(`The Material type ${newMaterialTypeName} was successfully deleted`);
  InteractorsTools.closeCalloutMessage();
};

function waitLoading() { cy.expect(Pane({ id: 'controlled-vocab-pane' }).exists()); }

function getEditableListRow(rowNumber) { return EditableListRow({ index: +rowNumber.split('-')[1] }); }

export default {
  checkIsPresented,
  checkIsDeleted,
  verifyMessageOfDeteted,
  getEditableListRow,
  waitLoading,

  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${id}`,
    });
  },

  edit:(materialTypeName, newMaterialTypeName) => {
    cy.do(MultiColumnListCell({ content: materialTypeName }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(Button({ icon: 'edit' })).click());
      }
    ));
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  delete(newMaterialTypeName) {
    cy.do(MultiColumnListCell({ content: newMaterialTypeName }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(Button({ icon: 'trash' })).click());
      }
    ));
    ModalDeleteMaterialType.deleteMaterialType();
    cy.expect(Modal('Delete Material type').absent());
  }
};
