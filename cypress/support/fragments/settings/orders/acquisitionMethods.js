import uuid from 'uuid';
import {
  Button,
  EditableListRow,
  MultiColumnListCell,
  Pane,
  TextField,
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

  editAcquisitionMethod: (AMName) => {
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
    cy.do([TextField().fillIn(`${AMName}-edited`), acquisitionMethodPane.find(saveButton).click()]);
  },

  deleteAcquisitionMethod: (AMName) => {
    cy.do(
      MultiColumnListCell({ content: `${AMName}-edited` }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    cy.do(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click());
    InteractorsTools.checkCalloutMessage(
      `The acquisition method ${AMName}-edited was successfully deleted`,
    );
  },
};
