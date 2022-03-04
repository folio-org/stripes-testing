import { PaneHeader, Button, MultiColumnListCell, MultiColumnListRow, MultiColumnList, TextField, MultiSelect, PaneSet } from '../../../../../interactors';

const rootPaneset = PaneSet({ id:'settings-owners' });
const addButton = rootPaneset.find(Button({ id:'clickable-add-settings-owners' }));

const defaultServicePoints = ['Circ Desk 1',
  'Circ Desk 2',
  'Online'];

export default {
  waitLoading:() => cy.expect(PaneHeader('Fee/fine: Owners').exists()),
  addNewLine: () => cy.do(addButton.click()),
  defaultServicePoints,
  getUsedServicePoints: () => {
    cy.then(rootPaneset.find(MultiColumnList()).rowCount()).then(rowsCount => {
      const usedServicePoints = [];
      for (let i = 0; i < rowsCount; i++) {
        cy.then(rootPaneset.find(MultiColumnListCell({ index:2, row:i })).content())
          .then(servicePointName => usedServicePoints.add(servicePointName));
      }
      return usedServicePoints;
    });
  },
  fill: (userName, servicePoint) => {
    cy.do(rootPaneset.find(TextField({ name:'items[0].owner' })).fillIn(userName));
    cy.do(rootPaneset.find(MultiSelect('owner-service-point-label')).select(servicePoint));
  },
  save:(rowNumber = 0) => cy.do(rootPaneset.find(Button({ id:`clickable-save-settings-owners-${rowNumber}` })).click())
};
