import uuid from 'uuid';

import {
  Button,
  Pane,
  TextField,
  HTML,
  including,
  Modal,
  NavListItem,
  MultiColumnListCell,
  EditableListRow,
} from '../../../../../interactors';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';
import getRandomPostfix from '../../../utils/stringTools';

const pane = Pane('Material types');

const isPresented = (materialTypeName) => {
  cy.expect(pane.find(HTML(including(materialTypeName))).exists());
};

const checkIsDeleted = (newMaterialTypeName) => {
  cy.expect(pane.find(HTML(including(newMaterialTypeName))).absent());
};

const verifyMessageOfDeteted = (newMaterialTypeName) => {
  InteractorsTools.checkCalloutMessage(
    `The Material type ${newMaterialTypeName} was successfully deleted`,
  );
  InteractorsTools.closeCalloutMessage();
};
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  isPresented,
  checkIsDeleted,
  verifyMessageOfDeteted,
  getDefaultMaterialType() {
    return { id: uuid(), name: `autotest_material_type_${getRandomPostfix()}`, source: 'local' };
  },
  createMaterialType(materialTypeName) {
    cy.do(Button('+ New').click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(materialTypeName));
    cy.do(Button('Save').click());
  },
  getMaterialTypesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'material-types',
        isDefaultSearchParamsRequired: false,
        searchParams,
      })
      .then(({ body }) => body);
  },
  createMaterialTypeViaApi(materialTypeProperties) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'material-types',
        body: materialTypeProperties,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi(materialTypeId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${materialTypeId}`,
      failOnStatusCode: false,
    });
  },

  edit: (materialTypeName, newMaterialTypeName) => {
    cy.do(
      MultiColumnListCell({ content: materialTypeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  delete: (newMaterialTypeName) => {
    cy.do(
      MultiColumnListCell({ content: newMaterialTypeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    ModalDeleteMaterialType.deleteMaterialType();
    cy.expect(Modal('Delete Material type').absent());
  },

  checkAvailableOptions: () => {
    cy.expect(Pane('Inventory').find(NavListItem('Material types')).exists());
  },
};
