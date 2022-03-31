import { Button, Pane, TextField, HTML, including, MultiColumnListRow } from '../../../../../interactors';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';

const pane = Pane('Material types');

const verifyMaterialTypeIsPresented = (materialTypeName) => {
  cy.expect(pane.find(HTML(including(materialTypeName))).exists());
};

const verifyMaterialTypeIsDeleted = (newMaterialTypeName) => {
  cy.expect(pane.find(HTML(including(newMaterialTypeName))).absent());
};

const verifyMessageOfDetetedMaterialType = (newMaterialTypeName) => {
  InteractorsTools.checkCalloutMessage(`The Material type ${newMaterialTypeName} was successfully deleted`);
  InteractorsTools.closeCalloutMessage();
};

export default {
  verifyMaterialTypeIsPresented,
  verifyMaterialTypeIsDeleted,
  verifyMessageOfDetetedMaterialType,

  createNewMaterialType:(materialTypeName) => {
    cy.do(Button('+ New').click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(materialTypeName));
    cy.do(Button('Save').click());
  },

  editMaterialType:(newMaterialTypeName) => {
    cy.do(MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(Button({ icon: 'edit' })).click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  deleteMaterialType:() => {
    cy.do(MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(Button({ icon: 'trash' })).click());
    ModalDeleteMaterialType.deleteMaterialType();
  },
};
