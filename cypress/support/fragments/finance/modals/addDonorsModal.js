import {
  Button,
  Checkbox,
  Modal,
  MultiColumnListRow,
  SearchField,
  including,
  or,
} from '../../../../../interactors';

const addDonorsModal = Modal('Add donors');
const searchField = SearchField({ id: 'input-record-search' });

const closeButton = addDonorsModal.find(Button('Close'));
const saveButton = addDonorsModal.find(Button('Save'));
const nextButton = Button('Next', { disabled: or(true, false) });
const previousButton = Button('Previous', { disabled: or(true, false) });

export default {
  verifyModalView() {
    cy.expect([
      addDonorsModal.exists(),
      closeButton.has({ disabled: false, visible: true }),
      saveButton.has({ disabled: true, visible: true }),
    ]);
  },
  searchByName(donorName) {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(donorName),
      Button('Search').click(),
    ]);
  },
  selectCheckboxFromResultsList(donorNames = []) {
    donorNames.forEach((donorName) => {
      cy.do(
        MultiColumnListRow({ content: including(donorName), isContainer: true })
          .find(Checkbox())
          .click(),
      );
    });
    cy.expect(addDonorsModal.has({ footer: including(`Total selected: ${donorNames.length}`) }));
  },
  clickCloseButton() {
    cy.do(closeButton.click());
    cy.expect(addDonorsModal.absent());
  },
  clickSaveButton() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    cy.expect(addDonorsModal.absent());
  },
  verifyTotalSelected(expected) {
    cy.get('[data-test-find-records-modal-save="true"]')
      .siblings('div')
      .should(($div) => {
        expect($div).to.have.length(1);
        expect($div.text().trim()).to.eq(`Total selected: ${expected}`);
      });
  },
  selectAllDonorsOnPage: () => {
    cy.get('[data-test-find-records-modal-select-all="true"]').click();
  },
  clickNextPaginationButton() {
    cy.do(nextButton.click());
    cy.wait(2000);
  },
  clickPreviousPaginationButton: () => {
    cy.do(previousButton.click());
  },
};
