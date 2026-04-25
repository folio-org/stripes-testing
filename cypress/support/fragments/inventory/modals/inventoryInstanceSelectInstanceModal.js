import { HTML, including, or } from '@interactors/html';
import {
  Button,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  SearchField,
} from '../../../../../interactors';

const rootModal = Modal('Select instance');
const searchField = SearchField('Search field index');
const searchButton = Button('Search');
const heldbyAccordionName = 'Held by';

export default {
  waitLoading() {
    cy.expect(rootModal.exists());
  },
  searchByHrId(instanceHrId) {
    cy.expect(
      rootModal
        .find(HTML(including('Choose a filter or enter a search query to show result')))
        .exists(),
    );
    cy.do(rootModal.find(SearchField('Search field index')).selectIndex('Instance HRID'));
    cy.do(rootModal.find(SearchField('Search field index')).fillIn(instanceHrId));
    cy.do(rootModal.find(Button('Search')).click());
    cy.expect(rootModal.find(MultiColumnList()).has({ rowCount: 1 }));
  },
  searchByTitle(title) {
    cy.expect(
      rootModal
        .find(HTML(including('Choose a filter or enter a search query to show result')))
        .exists(),
    );
    cy.do([
      rootModal.find(searchField).selectIndex('Title (all)'),
      rootModal.find(searchField).fillIn(title),
      rootModal.find(searchButton).click(),
    ]);
    cy.expect(rootModal.find(MultiColumnList()).has({ rowCount: 1 }));
  },
  selectInstance(rowNumber = 0) {
    cy.do(rootModal.find(MultiColumnList()).click({ row: rowNumber }));
    cy.expect(rootModal.absent());
  },

  verifyModalExists() {
    cy.expect(rootModal.exists());
  },
  verifySharedFacetExistsInFilter() {
    cy.do(rootModal.find(Button({ id: 'accordion-toggle-button-shared' })).exists());
  },
  verifyInstanceExistsInList(instanceTitle) {
    cy.expect(
      rootModal
        .find(MultiColumnList({ id: 'list-plugin-find-records' }))
        .find(MultiColumnListCell(instanceTitle))
        .exists(),
    );
  },

  close() {
    cy.do(rootModal.dismiss());
    cy.expect(rootModal.absent());
  },

  clearDefaultFilter(accordionName) {
    cy.do(
      Button({
        ariaLabel: or(
          `Clear selected filters for "${accordionName}"`,
          `Clear selected ${accordionName} filters`,
        ),
      }).click(),
    );
  },

  clearDefaultHeldbyFilter() {
    cy.wait(2000);
    this.clearDefaultFilter(heldbyAccordionName);
    cy.expect(
      Button({
        ariaLabel: or(
          `Clear selected filters for "${heldbyAccordionName}"`,
          `Clear selected ${heldbyAccordionName} filters`,
        ),
      }).absent(),
    );
  },
};
