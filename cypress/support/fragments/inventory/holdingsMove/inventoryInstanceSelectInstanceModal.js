import {
  Modal, Button, MultiColumnList, HTML, including, SearchField
} from '../../../../../interactors';


const rootModal = Modal('Select instance');

export default {
  waitLoading() {
    cy.expect(rootModal.exists());
  },
  searchByHrId(instanceHrId) {
    cy.expect(rootModal.find(HTML(including('Choose a filter or enter a search query to show result'))).exists());
    cy.do(rootModal.find(SearchField('Search field index')).selectIndex('Instance HRID'));
    cy.do(rootModal.find(SearchField('Search field index')).fillIn(instanceHrId));
    cy.do(rootModal.find(Button('Search')).click());
    cy.expect(rootModal.find(MultiColumnList()).has({ rowCount:1 }));
  },
  selectInstance(rowNumber = 0) {
    cy.do(rootModal.find(MultiColumnList()).click({ row:rowNumber }));
    cy.expect(rootModal.absent());
  }
};
