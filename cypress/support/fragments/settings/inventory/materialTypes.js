import uuid from 'uuid';

import {
  Button,
  Pane,
  TextField,
  HTML,
  including,
  Modal,
  NavListItem,
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
    });
  },

  edit: (materialTypeName, newMaterialTypeName) => {
    cy.contains(materialTypeName).then((elem) => {
      elem.parent()[0].querySelector('button[icon="edit"]').click();
    });
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  delete: (newMaterialTypeName) => {
    cy.contains(newMaterialTypeName).then((elem) => {
      elem.parent()[0].querySelector('button[icon="trash"]').click();
    });
    ModalDeleteMaterialType.deleteMaterialType();
    cy.expect(Modal('Delete Material type').absent());
  },

  checkAvailableOptions: () => {
    cy.expect(Pane('Inventory').find(NavListItem('Material types')).exists());
  },
};
