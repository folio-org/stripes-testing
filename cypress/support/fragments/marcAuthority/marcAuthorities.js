import { MultiColumnList, PaneHeader, Section, HTML, including, MultiColumnListRow, MultiColumnListCell, Button } from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));

export default {
  waitLoading: () => cy.expect(rootSection.exists()),
  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),
  select:(headingReferenceValue, rowNumber = 0) => cy.do(authoritiesList
    .find(MultiColumnListRow({ index:rowNumber }))
    .find(MultiColumnListCell(headingReferenceValue))
    .find(Button()).click())
};
