import { PaneHeader, Button, MultiColumnListCell, MultiColumnListRow, MultiColumnList, TextField, MultiSelect, PaneSet, EditableList } from '../../../../../interactors';

const rootPaneset = PaneSet({ id:'settings-owners' });
const addButton = rootPaneset.find(Button({ id:'clickable-add-settings-owners' }));
const tableWithOwners = rootPaneset.find(EditableList('editList-settings-owners'));

const defaultServicePoints = ['Circ Desk 1',
  'Circ Desk 2',
  'Online'];

export default {
  waitLoading:() => {
    cy.expect(PaneHeader('Fee/fine: Owners').exists());
    cy.expect(addButton.exists());
  },
  addNewLine: () => {
    cy.do(addButton.click());
    cy.expect(tableWithOwners.exists());
  },
  defaultServicePoints,
  getUsedServicePoints: () => {
    cy.then(() => tableWithOwners.rowCount()).then(rowsCount => {
      const usedServicePoints = [];
      for (let i = 0; i < rowsCount; i++) {
        cy.then(() => rootPaneset.find(tableWithOwners).find(MultiColumnListCell({ columnIndex:1, row:i+1 })).content())
          .then(servicePointName => usedServicePoints.push(servicePointName));
        cy.log('usedServicePoints=' + usedServicePoints);
      }
      cy.wrap(usedServicePoints).as('usedServicePoints');
    });
    return cy.get('@usedServicePoints');
  },
  fill: (userName, servicePoint) => {
    cy.do(rootPaneset.find(TextField({ name:'items[0].owner' })).fillIn(userName));
    cy.do(rootPaneset.find(MultiSelect('owner-service-point-label')).select(servicePoint));
  },
  save:(rowNumber = 0) => cy.do(rootPaneset.find(Button({ id:`clickable-save-settings-owners-${rowNumber}` })).click())
};
