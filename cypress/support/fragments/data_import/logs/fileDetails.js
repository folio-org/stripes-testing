import { MultiColumnListCell, MultiColumnList, MultiColumnListHeader } from '../../../../../interactors';

const columnName = {
  srsMarc: MultiColumnList({ id:'search-results-list' }).find(MultiColumnListHeader({ id:'list-column-srsmarcstatus' })),
  instance: MultiColumnList({ id:'search-results-list' }).find(MultiColumnListHeader({ id:'list-column-instancestatus' })),
  holdings: MultiColumnList({ id:'search-results-list' }).find(MultiColumnListHeader({ id:'list-column-holdingsstatus' })),
  item: MultiColumnList({ id:'search-results-list' }).find(MultiColumnListHeader({ id:'list-column-itemstatus' })),
  invoice: MultiColumnList({ id:'search-results-list' }).find(MultiColumnListHeader({ id:'list-column-invoicestatus' }))
};

const status = {
  created: 'Created',
  updated: 'Updated'
};

const checkStatusInColumn = (specialStatus, specialColumnName) => {
  cy.then(() => specialColumnName.index())
    .then((index) => cy.expect(MultiColumnList({ id:'search-results-list' }).find(MultiColumnListCell({ columnIndex: index }))
      .has({ content: specialStatus })));
};

const invoiceNumberFromEdifactFile = '94999';

export default {
  columnName,
  status,
  checkStatusInColumn,

  invoiceNumberFromEdifactFile,
};
