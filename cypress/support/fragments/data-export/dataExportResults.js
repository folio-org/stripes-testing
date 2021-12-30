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
  }
};
