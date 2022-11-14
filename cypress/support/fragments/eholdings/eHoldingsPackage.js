import { Accordion, Button, Modal, Section, RadioButton, HTML, including, MultiSelect, KeyValue, MultiSelectOption, ValueChipRoot, Spinner } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import { getLongDelay } from '../../utils/cypressTools';

const titlesFilterModal = Modal({ id : 'eholdings-details-view-search-modal' });
const tagsSection = Section({ id: 'packageShowTags' });
const closeButton = Button({ icon: 'times' });

const filterStatuses = { all: 'All',
  selected: 'Selected',
  notSelected: 'Not selected' };

const packageHoldingStatusSection = Section({ id: 'packageShowHoldingStatus' });
const titlesSection = Section({ id: 'packageShowTitles' });
const confirmationModal = Modal({ id:'eholdings-confirmation-modal' });

const getElementIdByName = (packageName) => packageName.replaceAll(' ', '-').toLowerCase();

const waitTitlesLoading = () => cy.url().then(url => {
  const packageId = url.split('?')[0].split('/').at(-1);
  cy.intercept(`eholdings/packages/${packageId}/resources?**`).as('getTitles');
  cy.wait('@getTitles', getLongDelay());
});

export default {
  filterStatuses,
  waitLoading: (specialPackage) => {
    cy.expect(Section({ id : getElementIdByName(specialPackage) }).exists());
    cy.expect(tagsSection.find(MultiSelect()).exists());
  },

  addToHodlings: () => {
    cy.do(packageHoldingStatusSection.find(Button('Add package to holdings')).click());
    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(Button('Add package (all titles) to holdings')).click());
    cy.expect(confirmationModal.absent());
  },
  filterTitles: (selectionStatus = filterStatuses.notSelected) => {
    cy.do(titlesSection.find(Button({ icon: 'search' })).click());
    cy.expect(titlesFilterModal.exists());
    const selectionStatusAccordion = titlesFilterModal.find(Accordion({ id: 'filter-titles-selected' }));
    const selectionStatusButton = selectionStatusAccordion.find(Button({ id: 'accordion-toggle-button-filter-titles-selected' }));
    cy.do(selectionStatusButton.click());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(titlesFilterModal.find(Button('Search')).click());
    cy.expect(titlesFilterModal.absent());
    waitTitlesLoading().then(() => {
      cy.expect(Spinner().absent());
    });
  },
  verifyHoldingStatus:(expectedStatus = filterStatuses.selected) => {
    cy.expect(packageHoldingStatusSection.find(HTML(including(expectedStatus))).exists());
    // TODO: request dynamic loading of titles
    // need to load changed state of titles
    // Temporarily added a wait so that the titles have time to change their state
    cy.wait(2000);
    cy.reload();
    cy.url().then(url => {
      const packageId = url.split('?')[0].split('/').at(-1);
      cy.intercept(`eholdings/packages/${packageId}/resources?**`).as('getTitles');
      cy.wait('@getTitles', getLongDelay()).then(() => {
        cy.expect(titlesSection.find(HTML(including(expectedStatus))).exists());
      });
    });
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
  },
  removeExistingTags: () => {
    cy.then(() => tagsSection.find(MultiSelect()).selected())
      .then(selectedTags => {
        selectedTags.forEach(selectedTag => {
          const specialTagElement = tagsSection.find(ValueChipRoot(selectedTag));
          cy.do(specialTagElement.find(closeButton).click());
          cy.expect(specialTagElement.absent());
        });
      });
  },
  verifyDeletedTags:(...expectedTags) => {
    expectedTags.forEach(tag => {
      cy.expect(tagsSection.find(HTML(including(tag))).absent());
    });
  }
};
