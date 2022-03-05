import { PaneHeader, Button, MultiColumnListCell, TextField, MultiSelect, PaneSet, EditableList, EditableListRow, Modal } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

const rootPaneset = PaneSet({ id:'settings-owners' });
const addButton = rootPaneset.find(Button({ id:'clickable-add-settings-owners' }));
const tableWithOwners = rootPaneset.find(EditableList('editList-settings-owners'));

const defaultServicePoints = ['Circ Desk 1',
  'Circ Desk 2',
  'Online'];

const startRowIndex = 2;

export default {
  waitLoading:() => {
    cy.intercept(
      {
        method: 'GET',
        url: '/service-points??*',
      }
    ).as('getServicePoints');
    cy.wait('@getServicePoints', getLongDelay());
    cy.expect(PaneHeader('Fee/fine: Owners').exists());
    cy.expect(addButton.exists());
  },
  addNewLine: () => {
    cy.do(addButton.click());
    cy.expect(tableWithOwners.exists());
  },
  defaultServicePoints,
  getUsedServicePoints: () => {
    cy.then(() => rootPaneset.find(EditableList()).isPresented()).then(isPresented => {
      if (isPresented) {
        cy.then(() => tableWithOwners.rowCount()).then(rowsCount => {
          const usedServicePoints = [];
          for (let i = 0; i < rowsCount; i++) {
            cy.then(() => tableWithOwners.find(EditableListRow({ index:i }))
            // read value from thrid column(2 in case of 0 in initial position)
              .find(MultiColumnListCell({ columnIndex:startRowIndex })).liValues())
              .then(servicePointNames => {
                usedServicePoints.push(servicePointNames);
                // flat related with cases when several service points assigned to one user
                cy.wrap(usedServicePoints.flat(1)).as('usedServicePoints');
              });
          }
        });
      } else {
        cy.wrap([]).as('usedServicePoints');
      }
    });
    return cy.get('@usedServicePoints');
  },
  fill: (userName, servicePoint) => {
    cy.do(tableWithOwners.find(TextField({ name:'items[0].owner' })).fillIn(userName));
    cy.do(tableWithOwners.find(MultiSelect({ ariaLabelledby: 'associated-service-point-label' })).select(servicePoint));
  },
  save:(rowNumber = 0) => cy.do(rootPaneset.find(Button({ id:`clickable-save-settings-owners-${rowNumber}` })).click()),
  delete: (selectedDervicePoint) => {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(selectedDervicePoint)).row())
      .then(rowNumber => {
        // filter index implemented based on parent-child relations. aria-rowindex calculated started from 2. Need to count it.
        cy.do(tableWithOwners.find(EditableListRow({ index:rowNumber - startRowIndex })).find(Button({ icon:'trash' })).click());
        cy.do(Modal('Delete Fee/fine owner').find(Button('Delete')).click());
        cy.expect(Modal('Delete Fee/fine owner').absent());
      });
  }
};
