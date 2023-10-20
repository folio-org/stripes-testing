import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  KeyValue,
  Modal,
  RadioButton,
  MultiSelect,
  MultiSelectOption,
  Section,
  Select,
  Spinner,
  TextField,
  ValueChipRoot,
  including,
} from '../../../../interactors';
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
  notSelected: 'Not selected',
};
const packageHoldingStatusSection = Section({ id: 'packageShowHoldingStatus' });
const titlesSection = Section({ id: 'packageShowTitles' });
const confirmationModal = Modal({ id: 'eholdings-confirmation-modal' });
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const customLabelButton = Button('Custom labels');
const displayLabel = (number) => TextField({ name: `customLabel${number}.displayLabel` });
const fullTextFinderCheckbox = (number) => Checkbox({ name: `customLabel${number}.displayOnFullTextFinder` });
const saveButton = Button('Save');
const calloutEditLabelSettings = HTML(including('Custom labels have been updated'));
const getElementIdByName = (packageName) => packageName.replaceAll(' ', '-').toLowerCase();
const waitTitlesLoading = () => cy.url().then((url) => {
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
    const selectionStatusAccordion = titlesFilterModal.find(
      Accordion({ id: 'filter-titles-selected' }),
    );
    const selectionStatusButton = selectionStatusAccordion.find(
      Button({ id: 'accordion-toggle-button-filter-titles-selected' }),
    );
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
    cy.url().then((url) => {
      const packageId = url.split('?')[0].split('/').at(-1);
      cy.intercept(`eholdings/packages/${packageId}/resources?**`).as('getTitles');
      cy.wait('@getTitles', getLongDelay()).then(() => {
        cy.expect(titlesSection.find(HTML(including(expectedStatus))).exists());
      });
    });
  },

  updateCustomLabelInSettings(labelName, labelNumber) {
    cy.do([
      customLabelButton.click(),
      displayLabel(labelNumber).fillIn(labelName),
      saveButton.click(),
    ]);
    cy.expect([
      calloutEditLabelSettings.exists(),
      displayLabel(labelNumber).has({ value: labelName }),
      saveButton.has({ disabled: true }),
    ]);
    // wait for setting to apply
    cy.expect(calloutEditLabelSettings.exists());
    let timeCounter = 0;
    function checkCustomLabel(name) {
      cy.okapiRequest({
        path: 'eholdings/custom-labels',
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        if (
          body.data.filter((label) => label.attributes.displayLabel === name).length === 1 ||
          timeCounter >= '15000'
        ) {
          cy.log(`Custom label value "${name}" saved`);
        } else {
          // wait 1 second before retrying request
          cy.wait(1000);
          checkCustomLabel(name);
          timeCounter++;
        }
      });
    }
    checkCustomLabel(labelName);
  },

  setFullTextFinderForLabel(labelIndex) {
    cy.do([fullTextFinderCheckbox(labelIndex).click(), saveButton.click()]);
    // wait for setting to apply
    cy.wait(1500);
    cy.expect(calloutEditLabelSettings.exists());
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
    cy.then(() => tagsSection.find(MultiSelect()).selected()).then((selectedTags) => {
      cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
      cy.do(MultiSelectOption(`Add tag for: ${newTag}`).click());
      cy.expect(
        tagsSection.find(MultiSelect({ selected: [...selectedTags, newTag].sort() })).exists(),
      );
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
    expectedTags.forEach((tag) => {
      cy.expect(tagsSection.find(HTML(including(tag))).exists());
    });
  },

  removeExistingTags: () => {
    cy.then(() => tagsSection.find(MultiSelect()).selected()).then((selectedTags) => {
      selectedTags.forEach((selectedTag) => {
        const specialTagElement = tagsSection.find(ValueChipRoot(selectedTag));
        cy.do(specialTagElement.find(closeButton).click());
        cy.expect(specialTagElement.absent());
      });
    });
  },

  verifyDeletedTags: (...expectedTags) => {
    expectedTags.forEach((tag) => {
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
