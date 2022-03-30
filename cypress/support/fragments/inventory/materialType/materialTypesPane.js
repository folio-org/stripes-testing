import { Button, Pane, TextField, HTML, including, MultiColumnListRow } from '../../../../../interactors';
import SettingsMenu from '../../settingsMenu';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';

const verifyMaterialTypeIsPresented = (materialTypeName) => {
  cy.expect(Pane('Material types').find(HTML(including(materialTypeName))).exists());
};

const verifyMaterialTypeIsDeleted = (materialTypeName) => {
  cy.expect(Pane('Material types').find(HTML(including(materialTypeName))).absent());
};

export default {
  createNewMaterialType:(materialTypeName) => {
    cy.visit(SettingsMenu.materialTypePath);
    cy.do(Button('+ New').click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(materialTypeName));
    cy.do(Button('Save').click());
    verifyMaterialTypeIsPresented(materialTypeName);
  },

  editMaterialType:(newMaterialTypeName) => {
    cy.do(MultiColumnListRow({ rowIndex: 'row-0' }).find(Button({ icon: 'edit' })).click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
    verifyMaterialTypeIsPresented(newMaterialTypeName);
  },

  deleteMaterialType:(newMaterialTypeName) => {
    cy.do(MultiColumnListRow({ rowIndex: 'row-0' }).find(Button({ icon: 'trash' })).click());
    ModalDeleteMaterialType.createNewMaterialType();
    verifyMaterialTypeIsDeleted(newMaterialTypeName);
    InteractorsTools.checkCalloutMessage(`The Material type ${newMaterialTypeName} was successfully deleted`);
    InteractorsTools.closeCalloutMessage();
  },
};
