import { Accordion, Button, Modal, Section, RadioButton, ListItem, HTML, including, Pane, MultiSelect, KeyValue, TextInput, MultiSelectOption } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

// const packagesSection = Section({ id: 'titleShowPackages' });
const titlesFilterModal = Modal({ id : 'eholdings-details-view-search-modal' });
const tagsSection = Section({ id: 'packageShowTags' });

const filterTitlesStatuses = { all: 'All',
  selected: 'Selected',
  notSelected: 'Not selected' };

const packageHoldingStatusSection = Section({ id: 'packageHoldingStatus' });
const titlesSection = Section({ id: 'packageShowTitles' });
const confirmationModal = Modal({ id:'eholdings-confirmation-modal' });

const getElementIdByName = (packageName) => packageName.replaceAll(' ', '-').toLowerCase();

export default {
  filterTitlesStatuses,
  waitLoading: (specialPackage) => {
    cy.expect(Section({ id : getElementIdByName(specialPackage) }).exists());
    cy.expect(tagsSection.find(MultiSelect()).exists());
  },

  addToHodlings: () => {
    cy.do(packageHoldingStatusSection.find(Button('Add package to holdings')).click());
    cy.expect(confirmationModal.exists());
    // TODO: remove static waiters after fix of https://issues.folio.org/browse/UIEH-1228
    cy.wait(1000);
    cy.do(confirmationModal.find(Button('Add package (all titles) to holdings')).click());
    cy.expect(confirmationModal.absent());
  },
  filterTitles: (selectionStatus = filterTitlesStatuses.notSelected) => {
    cy.do(titlesSection.find(Button({ icon: 'search' })).click());
    cy.expect(titlesFilterModal.exists());
    const selectionStatusAccordion = titlesFilterModal.find(Accordion({ id: 'filter-titles-selected' }));
    const selectionStatusButton = selectionStatusAccordion.find(Button({ id: 'accordion-toggle-button-filter-titles-selected' }));
    cy.do(selectionStatusButton.click());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
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
    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(Button('Yes, remove')).click());
    cy.expect(confirmationModal.absent());
  },
  addTag:() => {
    const newTag = `tag${getRandomPostfix()}`;
    cy.then(() => tagsSection.find(MultiSelect()).selected())
      .then(selectedTags => {
        cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
        cy.do(tagsSection.find(MultiSelect()).focus());
        cy.do(MultiSelectOption(`Add tag for: ${newTag}`).click());
        cy.expect(tagsSection.find(MultiSelect({ selected: [...selectedTags, newTag].sort() })).exists());
      });

    return newTag;
  },
  close:(packageName) => {
    const packageId = getElementIdByName(packageName);
    const section = Section({ id : packageId });
    cy.do(section.find(Button({ icon:'times', ariaLabel:`Close ${packageName}` })).click());
    cy.expect(section.absent());
  },
  verifyExistingTags:(...expectedTags) => {
    expectedTags.forEach(tag => {
      cy.expect(tagsSection.find(HTML(including(tag))).exists());
    });
  }
};
