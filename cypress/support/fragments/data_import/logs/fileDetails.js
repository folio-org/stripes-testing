import { MultiColumnListCell, MultiColumnList, MultiColumnListHeader } from '../../../../../interactors';

const resultsList = MultiColumnList({ id:'search-results-list' });

const columnName = {
  srsMarc: resultsList.find(MultiColumnListHeader({ id:'list-column-srsmarcstatus' })),
  instance: resultsList.find(MultiColumnListHeader({ id:'list-column-instancestatus' })),
  holdings: resultsList.find(MultiColumnListHeader({ id:'list-column-holdingsstatus' })),
  item: resultsList.find(MultiColumnListHeader({ id:'list-column-itemstatus' })),
  invoice: resultsList.find(MultiColumnListHeader({ id:'list-column-invoicestatus' }))
};

const status = {
  created: 'Created',
  updated: 'Updated'
};

const checkStatusInColumn = (specialStatus, specialColumnName) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(resultsList.find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: specialStatus })));
};

const invoiceNumberFromEdifactFile = '94999';

export default {
  columnName,
  status,
  checkStatusInColumn,

  invoiceNumberFromEdifactFile,
};
