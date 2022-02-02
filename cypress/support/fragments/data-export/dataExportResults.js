import InventorySearch from '../inventory/inventorySearch';
import { MultiColumnListCell } from '../../../../interactors';

const defaultJobProfile = 'Default instances export job profile';
const quickExportFileNameMask = /quick-export-\d{1,3}.mrc/gm;


export default {
  verifyQuickExportResult() {
    cy.do([
      InventorySearch.getSearchResult(0, 0).perform(element => {
        expect(element.innerText).to.match(quickExportFileNameMask);
      }),
      MultiColumnListCell({ 'row': 0, 'column': defaultJobProfile }).exists(),
    ]);
  },

  verifySuccessExportResultCells() {
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{2}:\d{2}\s\w{2}/gm;
    return cy.do([
      MultiColumnListCell({ 'row': 0, columnIndex: 1 }).is({ content: 'Completed' }),
      MultiColumnListCell({ 'row': 0, columnIndex: 2 }).perform(element => {
        expect(element.innerText).to.match(/\d{1,4}/gm);
      }),
      MultiColumnListCell({ 'row': 0, columnIndex: 3 }).is({ content: '' }),
      MultiColumnListCell({ 'row': 0, columnIndex: 4 }).is({ content: defaultJobProfile }),
      MultiColumnListCell({ 'row': 0, columnIndex: 5 }).perform(element => {
        expect(element.innerText).to.match(dateString);
      }),
      MultiColumnListCell({ 'row': 0, columnIndex: 6 }).is({ content: 'DIKU ADMINISTRATOR' }),
      MultiColumnListCell({ 'row': 0, columnIndex: 7 }).perform(element => {
        expect(element.innerText).to.match(/\d{1,4}/gm);
      }),
    ]);
  },
};
