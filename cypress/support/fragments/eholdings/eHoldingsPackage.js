import { Accordion, Button, Modal, Section, RadioButton, ListItem, HTML, including, Pane, MultiSelect, KeyValue } from '../../../../interactors';

// const packagesSection = Section({ id: 'titleShowPackages' });
const titlesFilterModal = Modal({ id : 'eholdings-details-view-search-modal' });

const filterTitlesStatuses = { all: 'All',
  selected: 'Selected',
  notSelected: 'Not selected' };

const packageHoldingStatusSection = Section({ id: 'packageHoldingStatus' });
const titlesSection = Section({ id: 'packageShowTitles' });
const confirmationModal = Modal({ id:'eholdings-confirmation-modal' });

export default {
  filterTitlesStatuses,
  waitLoading: (specialPackage) => {
    cy.expect(Section({ id : specialPackage.replaceAll(' ', '-').toLowerCase() }).exists());
  },

  addToHodlings: () => {
    cy.do(packageHoldingStatusSection.find(Button('Add package to holdings')).click());
    cy.do(confirmationModal.find(Button('Add package (all titles) to holdings')).click());
    cy.expect(confirmationModal.absent());
  },
  filterTitles: (selectionStatus = filterTitlesStatuses.notSelected) => {
    cy.do(titlesSection.find(Button({ icon: 'search' })).click());
    const selectionStatusAccordion = titlesFilterModal.find(Accordion({ id: 'filter-titles-selected' }));

    cy.expect(titlesFilterModal.exists());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    cy.do(titlesFilterModal.find(Button('Search')).click());
    cy.expect(titlesFilterModal.absent());
  },
  verifyHoldingStatus:() => {
    cy.expect(packageHoldingStatusSection.find(HTML(including(filterTitlesStatuses.selected))).exists());
    cy.expect(titlesSection.find(HTML(including(filterTitlesStatuses.selected))).exists());
    cy.expect(titlesSection.find(HTML(including(filterTitlesStatuses.notSelected))).absent());
  },
  checkEmptyTitlesList:() => {
    cy.expect(titlesSection.find(KeyValue('Records found', { value:'0' })));
  },
  removeFromHoldings:() => {
    cy.do(Button('Actions').click());
    cy.do(Button('Remove from holdings').click());
    cy.do(confirmationModal.find(Button('Yes, remove')));
  }
};
