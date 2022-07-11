import uuid from 'uuid';
import { Button, Pane, TextField, HTML, including, MultiColumnListRow } from '../../../../../interactors';
import ModalDeleteMaterialType from './modalDeleteMaterialType';
import InteractorsTools from '../../../utils/interactorsTools';
import { getTestEntityValue } from '../../../utils/stringTools';

export const defaultMaterialType = {
  source: 'local',
  name: getTestEntityValue(),
  id: uuid(),
};

const pane = Pane('Material types');

const isPresented = (materialTypeName) => {
  cy.expect(pane.find(HTML(including(materialTypeName))).exists());
};

const isDeleted = (newMaterialTypeName) => {
  cy.expect(pane.find(HTML(including(newMaterialTypeName))).absent());
};

const verifyMessageOfDeteted = (newMaterialTypeName) => {
  InteractorsTools.checkCalloutMessage(`The Material type ${newMaterialTypeName} was successfully deleted`);
  InteractorsTools.closeCalloutMessage();
};

const getDefaultMaterialType = () => {
  return defaultMaterialType;
};

export default {
  createApi(materialTypeProperties) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'material-types',
        body: materialTypeProperties,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response.body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${id}`,
    });
  },
  getMaterialTypesApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'material-types',
        searchParams,
      })
      .then(response => {
        return response.body.mtypes;
      });
  },
  getDefaultMaterialType,
  isPresented,
  isDeleted,
  verifyMessageOfDeteted,

  create:(materialTypeName) => {
    cy.do(Button('+ New').click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(materialTypeName));
    cy.do(Button('Save').click());
  },

  edit:(newMaterialTypeName) => {
    cy.do(MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(Button({ icon: 'edit' })).click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(newMaterialTypeName));
    cy.do(Button('Save').click());
  },

  delete:() => {
    cy.do(MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(Button({ icon: 'trash' })).click());
    ModalDeleteMaterialType.deleteMaterialType();
  },
};
