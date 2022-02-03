import InventorySearch from '../inventory/inventorySearch';
import { MultiColumnListCell } from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const quickExportFileNameMask = /quick-export-\d{1,3}.mrc/gm;


export default {
  defaultJobProfile: 'Default instances export job profile',
  verifyQuickExportResult() {
    cy.do([
      InventorySearch.getSearchResult(0, 0).perform(element => {
        expect(element.innerText).to.match(quickExportFileNameMask);
      }),
      MultiColumnListCell({ 'row': 0, 'column': this.defaultJobProfile }).exists(),
    ]);
  },

  verifySuccessExportResultCells(resultFileName, recordsCount, jobId) {
    const resultRow = {
      fileName: MultiColumnListCell({ 'row': 0, columnIndex: 0 }),
      status: MultiColumnListCell({ 'row': 0, columnIndex: 1 }),
      total: MultiColumnListCell({ 'row': 0, columnIndex: 2 }),
      failed: MultiColumnListCell({ 'row': 0, columnIndex: 3 }),
      jobProfile: MultiColumnListCell({ 'row': 0, columnIndex: 4 }),
      endedRunning: MultiColumnListCell({ 'row': 0, columnIndex: 5 }),
      runBy: MultiColumnListCell({ 'row': 0, columnIndex: 6 }),
      id: MultiColumnListCell({ 'row': 0, columnIndex: 7 }),
    };

    cy.do([
      resultRow.status.is({ content: 'Completed' }),
      resultRow.total.is({ content: recordsCount.toString() }),
      resultRow.failed.is({ content: '' }),
      resultRow.jobProfile.is({ content: this.defaultJobProfile }),
      resultRow.runBy.is({ content: 'DIKU ADMINISTRATOR' }),
      resultRow.id.is({ content: jobId.toString() })
    ]);

    // verify file name
    cy.do(
      resultRow.fileName.perform(element => {
        expect(element.innerText).to.equal(resultFileName);
        expect(element.innerText).to.include(`-${jobId}.mrc`);
      })
    );

    // verify date (ended running)
    const dateString = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    cy.do(resultRow.endedRunning.perform(element => {
      const actualDate = element.innerText;
      expect(actualDate).to.match(dateString);

      const dateWithUTC = Date.parse(new Date(actualDate + ' UTC'));
      DateTools.verifyDate(dateWithUTC, 180000);
    }));
  },
};
