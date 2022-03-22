import { MultiColumnListHeader, Section } from '../../../../interactors';

// TODO: redefine section id
const rootSection = Section({ id: 'authority-search-results-pane' });
const presentedColumns = ['Authorized/Reference', 'Heading/Reference', 'Type of heading'];

export default {
  waitLoading: () => cy.expect(rootSection.exists()),
  checkPresentedColumns:() => presentedColumns.forEach(columnName => cy.expect(rootSection.find(MultiColumnListHeader(columnName)).exists()))
};
