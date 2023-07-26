import { Accordion, Button, Checkbox, HTML, KeyValue, Modal, RadioButton, MultiSelect, MultiSelectOption, Section, Select, Spinner, TextField, ValueChipRoot, including } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix, { randomTwoDigitNumber } from '../../utils/stringTools';

const titlesFilterModal = Modal({ id: 'eholdings-details-view-search-modal' });
const tagsSection = Section({ id: 'packageShowTags' });
const closeButton = Button({ icon: 'times' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const removeFromHoldingsButton = Button('Remove from holdings');
const confirmButton = Button('Yes, remove');
const filterStatuses = {
  all: 'All',
  selected: 'Selected',
  notSelected: 'Not selected'
};
const packageHoldingStatusSection = Section({ id: 'packageShowHoldingStatus' });
const titlesSection = Section({ id: 'packageShowTitles' });
const confirmationModal = Modal({ id: 'eholdings-confirmation-modal' });
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const customLabelButton = Button('Custom labels');
const displayLabel = TextField({ name: 'customLabel1.displayLabel' });
const displayLabel1 = TextField({ name: 'customLabel2.displayLabel' });
const fullTextFinderCheckbox = Checkbox({ name: 'customLabel2.displayOnFullTextFinder' });
const saveButton = Button('Save');
const verifyCustomLabel = Section({ id: 'resourceShowCustomLabels' });
const getElementIdByName = (packageName) => packageName.replaceAll(' ', '-').toLowerCase();
const waitTitlesLoading = () => cy.url().then(url => {
  const packageId = url.split('?')[0].split('/').at(-1);
  cy.intercept(`eholdings/packages/${packageId}/resources?**`).as('getTitles');
  cy.wait('@getTitles', getLongDelay());
});

export default {
  filterStatuses,
  waitLoading: (specialPackage) => {
    cy.expect(Section({ id: getElementIdByName(specialPackage) }).exists());
    cy.expect(tagsSection.find(MultiSelect()).exists());
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

  verifyHoldingStatus: (expectedStatus = filterStatuses.selected) => {
    cy.expect(packageHoldingStatusSection.find(HTML(including(expectedStatus))).exists());
    // TODO: request dynamic loading of titles
    // need to load changed state of titles
    // Temporarily added a wait so that the titles have time to change their state
    cy.wait(10000);
    cy.reload();
    cy.url().then(url => {
      const packageId = url.split('?')[0].split('/').at(-1);
      cy.intercept(`eholdings/packages/${packageId}/resources?**`).as('getTitles');
      cy.wait('@getTitles', getLongDelay()).then(() => {
        cy.expect(titlesSection.find(HTML(including(expectedStatus))).exists());
      });
    });
  },

  customLabel(name) {
    cy.do([(customLabelButton).click(),
      displayLabel.fillIn(name.label1),
      displayLabel1.fillIn(name.label2),
      fullTextFinderCheckbox.click(),
      saveButton.click()
    ]);
    cy.visit('/eholdings/resources/58-473-185972');
    cy.expect(verifyCustomLabel.exists());
  },

  checkEmptyTitlesList: () => {
    cy.expect(titlesSection.find(KeyValue('Records found', { value: '0' })));
  },

  removeFromHoldings: () => {
    cy.do(actionsButton.click());
    cy.expect(removeFromHoldingsButton.exists());
    cy.do(removeFromHoldingsButton.click());
    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(confirmButton).click());
    cy.expect(confirmationModal.absent());
  },

  addTag: () => {
    const newTag = `tag${getRandomPostfix()}`;
    cy.then(() => tagsSection.find(MultiSelect()).selected())
      .then(selectedTags => {
        cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
        cy.do(MultiSelectOption(`Add tag for: ${newTag}`).click());
        cy.expect(tagsSection.find(MultiSelect({ selected: [...selectedTags, newTag].sort() })).exists());
      });
    return newTag;
  },

  close: (packageName) => {
    const packageId = getElementIdByName(packageName);
    const section = Section({ id: packageId });
    cy.do(section.find(Button({ icon: 'times', ariaLabel: `Close ${packageName}` })).click());
    cy.expect(section.absent());
  },

  verifyExistingTags: (...expectedTags) => {
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

  verifyDeletedTags: (...expectedTags) => {
    expectedTags.forEach(tag => {
      cy.expect(tagsSection.find(HTML(including(tag))).absent());
    });
  },

  addToHoldings: () => {
    cy.do(packageHoldingStatusSection.find(Button('Add package to holdings')).click());
    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(Button('Add package (all titles) to holdings')).click());
    cy.expect(confirmationModal.absent());
  },

  editProxyActions: () => {
    cy.expect(Spinner().absent());
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
  },
  getProxyValue: () => cy.then(() => KeyValue('Proxy').value()),
  proxy() {
    this.getProxyValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },
  changeProxy: () => {
    cy.get('select#eholdings-proxy-id option:selected')
      .invoke('text')
      .then((text) => {
        const options = availableProxies.filter((option) => option !== text);
        cy.do(proxySelect.choose(options[randomTwoDigitNumber()]));
      });
  },

  saveAndClose: () => {
    cy.do(Button('Save & close').click());
  },
};
