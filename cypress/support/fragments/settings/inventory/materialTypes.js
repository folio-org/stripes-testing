import {
  Button,
  Pane,
  TextField,
  HTML,
  including,
  MultiColumnListRow,
  Modal,
  MultiColumnList,
  MultiColumnListCell
} from '../../../../../interactors';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';

const pane = Pane('Material types');

const isPresented = (materialTypeName) => {
  cy.expect(pane.find(HTML(including(materialTypeName))).exists());
};

const checkIsDeleted = (newMaterialTypeName) => {
  cy.expect(pane.find(HTML(including(newMaterialTypeName))).absent());
};

const verifyMessageOfDeteted = (newMaterialTypeName) => {
  InteractorsTools.checkCalloutMessage(`The Material type ${newMaterialTypeName} was successfully deleted`);
  InteractorsTools.closeCalloutMessage();
};

const findRowIndex = (name) => cy.then(() => MultiColumnList({ id:'editList-materialtypes' })
  .find(MultiColumnListCell(name))
  .row());

export default {
  isPresented,
  checkIsDeleted,
  verifyMessageOfDeteted,

  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${id}`,
    });
  },

  edit:(newMaterialTypeName) => {
    cy.do(MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(Button({ icon: 'edit' })).click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  delete:(newMaterialTypeName) => {
    findRowIndex(newMaterialTypeName).then(rowNumber => {
      cy.do(MultiColumnList({ id:'editList-materialtypes' })
        .find(MultiColumnListRow({ rowIndexInParent :  `row-${rowNumber - 2}` }))
        .find(Button({ icon: 'trash' }))
        .click());
    });
    ModalDeleteMaterialType.deleteMaterialType();
    cy.expect(Modal('Delete Material type').absent());
  }
};
