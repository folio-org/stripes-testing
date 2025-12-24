import { recurse } from 'cypress-recurse';
import {
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
  TextArea,
  PaneHeader,
  MultiColumnList,
  MultiColumnListCell,
} from '../../../../interactors';
import { FILTER_STATUSES } from './eholdingsConstants';
import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix, { randomTwoDigitNumber } from '../../utils/stringTools';

const tagsSection = Section({ id: 'packageShowTags' });
const closeButton = Button({ icon: 'times' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const removeFromHoldingsButton = Button('Remove from holdings');
const confirmButton = Button('Yes, remove');
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
const providerTokenField = TextArea({ name: 'providerTokenValue' });
const providerTokenValue = KeyValue('Provider token');
const newNoteButton = Button({ id: 'note-create-button' });
const assignUnassignNoteButton = Button({ id: 'note-assign-button' });
const notesList = MultiColumnList({ id: 'notes-list' });
const titlesSearchOptionSelect = titlesSection.find(
  Select({ dataTestID: 'field-to-search-select' }),
);
const titlesSearchField = titlesSection.find(TextField({ type: 'search' }));
const cancelButton = Button('Cancel');
const saveAndCloseButton = Button('Save & close');
const unsavedChangesModal = Modal({ id: 'navigation-modal' });
const unsavedChangesText = Modal().find(
  HTML('Your changes have not been saved. Are you sure you want to leave this page?'),
);
const keepEditingButton = Modal().find(Button('Keep editing'));
const continueWithoutSavingButton = Modal().find(Button('Continue without saving'));
const closeIconButton = Button({ icon: 'times' });
const accessStatusTypeDropdown = Select({ id: 'eholdings-access-type-id' });

export default {
  waitLoading: (specialPackage) => {
    cy.expect(Section({ id: getElementIdByName(specialPackage) }).exists());
    cy.expect(tagsSection.find(MultiSelect()).exists());
  },
  verifySectionsToggle: (sectionIds = []) => {
    sectionIds.forEach((id) => {
      const section = Section({ id });
      cy.do(section.toggle());
      cy.expect(section.is({ expanded: false }));
      cy.do(section.toggle());
      cy.expect(section.is({ expanded: true }));
    });
  },

  filterTitles: (selectionStatus = FILTER_STATUSES.NOT_SELECTED) => {
    cy.do([titlesSection.find(actionsButton).click(), RadioButton(selectionStatus).click()]);
    waitTitlesLoading().then(() => {
      cy.expect(Spinner().absent());
    });
  },

  verifyHoldingStatus: (expectedStatus = FILTER_STATUSES.SELECTED) => {
    waitTitlesLoading().then(() => {
      cy.expect(titlesSection.exists());
      cy.expect(Spinner().absent());
    });
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
    cy.do(PaneHeader().find(actionsButton).click());
    cy.expect(removeFromHoldingsButton.exists());
    cy.do(removeFromHoldingsButton.click());
    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(confirmButton).click());
    cy.expect(confirmationModal.absent());
  },

  addTag: (newTag = `tag${getRandomPostfix()}`) => {
    cy.then(() => tagsSection.find(MultiSelect()).selected()).then(() => {
      cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
      cy.wait(500);
      cy.do(MultiSelectOption(`Add tag for: ${newTag}`).click());
      cy.wait(500);
      cy.do(tagsSection.find(MultiSelect()).close());
    });
    return newTag;
  },

  closePackage: () => {
    cy.do(PaneHeader().find(closeButton).click());
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

  verifyNotSelectedPackage: () => {
    cy.expect(packageHoldingStatusSection.find(Button('Add package to holdings')).exists());
  },

  editProxyActions: () => {
    cy.expect(Spinner().absent());
    cy.do(PaneHeader().find(actionsButton).click());
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
  changeToken(token) {
    cy.do(providerTokenField.fillIn(token));
  },
  verifyToken(token) {
    cy.expect(providerTokenValue.has({ value: including(token) }));
  },
  saveAndClose: () => {
    cy.do(Button('Save & close').click());
  },
  addNote() {
    cy.do(newNoteButton.click());
  },
  clickAssignNoteButton() {
    cy.do(assignUnassignNoteButton.click());
  },
  verifySpecialNotesRow({ title, details, type }) {
    cy.expect([
      notesList.exists(),
      notesList
        .find(MultiColumnListCell({ column: 'Title and details', content: including(title) }))
        .exists(),
      notesList
        .find(MultiColumnListCell({ column: 'Title and details', content: including(details) }))
        .exists(),
      notesList.find(MultiColumnListCell({ column: 'Type', content: including(type) })).exists(),
    ]);
  },
  selectTitleSearchOption(searchOption) {
    cy.do(titlesSearchOptionSelect.choose(searchOption));
    this.verifySelectedTitleSearchOption(searchOption);
  },
  verifySelectedTitleSearchOption(searchOption) {
    cy.expect(titlesSearchOptionSelect.has({ checkedOptionText: searchOption }));
  },
  searchTitles(searchValue, searchOption) {
    if (searchOption) this.selectTitleSearchOption(searchOption);
    cy.do(titlesSearchField.fillIn(searchValue));
    cy.intercept('GET', '**/eholdings/packages/*/resources?**').as('getTitles');
    cy.get('input[type="search"]').type('{enter}');
    cy.wait('@getTitles').its('response.statusCode').should('eq', 200);
    this.verifyTitlesSearchQuery(searchValue);
    cy.expect(titlesSection.find(Spinner()).absent());
  },
  verifyTitleFound(title) {
    cy.expect(titlesSection.find(MultiColumnListCell(title)).exists());
  },

  verifyTitlesSearchQuery(query) {
    cy.expect(titlesSearchField.has({ value: query }));
  },
  toggleTitlesAccordion(isOpen = true) {
    cy.do(titlesSection.toggle());
    cy.expect(titlesSection.is({ expanded: isOpen }));
  },

  verifySelectedPackage: () => {
    cy.expect(packageHoldingStatusSection.find(Button('Add package to holdings')).absent());
  },

  verifyTitlesAccordion: () => {
    cy.expect(titlesSection.exists());
  },

  verifyTitlesLoadingIndicator: () => {
    cy.expect(titlesSection.find(Spinner()).exists());
  },

  /**
   * Waits until the title with the given name in the specified package
   * has its visibilityData.isHidden property matching the isHidden parameter.
   *
   * @param {Object} params
   * @param {string} params.packageId - The package ID (e.g., '123355-1000196955')
   * @param {string} params.titleName - The title name to look for
   * @param {boolean} params.isHidden - The expected hidden state
   */
  waitForTitlesState({ packageId, titleName, isHidden } = {}) {
    const path = `eholdings/packages/${packageId}/resources`;
    const searchParams = {
      searchfield: 'title',
      count: 100,
      page: 1,
    };

    return recurse(
      () => cy.okapiRequest({
        path,
        searchParams,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      }),
      (response) => {
        if (response.status !== 200) return false;
        const found = response.body.data.find((item) => {
          return (
            item.attributes &&
            item.attributes.name === titleName &&
            item.attributes.visibilityData &&
            item.attributes.visibilityData.isHidden === isHidden
          );
        });
        return Boolean(found);
      },
      {
        delay: 2000,
        timeout: 30_000,
      },
    );
  },

  verifyButtonsDisabled: () => {
    cy.expect(cancelButton.has({ disabled: true }));
    cy.expect(saveAndCloseButton.has({ disabled: true }));
  },

  verifyButtonsEnabled: () => {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  cancelChanges: () => {
    cy.expect(cancelButton.exists());
    cy.do(cancelButton.click());
  },

  verifyUnsavedChangesModalExists: () => {
    cy.expect(unsavedChangesModal.exists());
    cy.expect(unsavedChangesText.exists());
  },

  verifyUnsavedChangesModalNotExists: () => {
    cy.expect(unsavedChangesModal.absent());
  },

  clickKeepEditing: () => {
    cy.expect(keepEditingButton.exists());
    cy.do(keepEditingButton.click());
  },

  clickContinueWithoutSaving: () => {
    cy.expect(continueWithoutSavingButton.exists());
    cy.do(continueWithoutSavingButton.click());
  },

  closeEditingWindow: () => {
    cy.expect(closeIconButton.exists());
    cy.do(closeIconButton.click());
  },

  openTitle: (titleName) => {
    cy.expect(titlesSection.exists());
    cy.do(titlesSection.find(Button(titleName)).click());
  },

  selectAccessStatusType: (accessStatusTypeName) => {
    cy.do(accessStatusTypeDropdown.choose(accessStatusTypeName));
    cy.expect(accessStatusTypeDropdown.has({ checkedOptionText: accessStatusTypeName }));
  },
};
