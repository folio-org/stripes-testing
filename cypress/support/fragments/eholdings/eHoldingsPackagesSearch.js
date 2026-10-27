import {
  Accordion,
  RadioButton,
  TextField,
  Button,
  Checkbox,
  List,
  ListItem,
  MultiSelect,
  MultiSelectOption,
  including,
  Section,
  Select,
  HTML,
  or,
} from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const contentTypeAccordion = Accordion({ id: 'filter-packages-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-packages-selected' });
const packageAccessAccordion = Accordion('Package access');
const tagsAccordion = Accordion({ id: 'accordionTagFilter' });
const byTagCheckbox = Checkbox('Search by tags only');
const accessStatusTypesAccordion = Accordion('Access status types');
const byAccessStatusTypesCheckbox = Checkbox('Search by access status types only');
const resultSection = Section({ id: 'search-results' });

export default {
  byContentType: (type) => {
    cy.do(contentTypeAccordion.clickHeader());
    cy.do(contentTypeAccordion.find(Select()).choose(type));
    eHoldingsPackages.waitLoading();
  },
  verifyContentTypeOptions: (options) => {
    cy.do(contentTypeAccordion.clickHeader());
    cy.expect(contentTypeAccordion.find(Select()).has({ optionsText: options }));
  },
  selectContentType(type) {
    cy.do(contentTypeAccordion.find(Select()).choose(type));
    this.verifyContentTypeSelected(type);
    eHoldingsPackages.waitLoading();
  },
  verifyContentTypeSelected: (type) => {
    cy.expect(contentTypeAccordion.find(Select()).has({ checkedOptionText: type }));
  },
  toggleContentTypeAccordion: () => {
    cy.do(contentTypeAccordion.clickHeader());
  },
  verifyContentTypeAccordionOpen: (isOpen = true) => {
    cy.expect(contentTypeAccordion.has({ open: isOpen }));
  },
  resetContentTypeFilter: () => {
    cy.do(contentTypeAccordion.find(Button({ icon: 'times-circle-solid' })).click());
    eHoldingsPackages.waitLoading();
  },
  bySelectionStatus: (selectionStatus) => {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    eHoldingsPackages.waitLoading();
  },
  // Opens the accordion, checks the given options, then closes it again so a following
  // bySelectionStatus() call (which always toggles the header open) still works as expected
  verifySelectionStatusOptions: (options) => {
    cy.do(selectionStatusAccordion.clickHeader());
    options.forEach((option) => {
      cy.expect(selectionStatusAccordion.find(RadioButton(option)).exists());
    });
    cy.do(selectionStatusAccordion.clickHeader());
  },
  resetSelectionStatusFilter: () => {
    cy.do(selectionStatusAccordion.find(Button({ icon: 'times-circle-solid' })).click());
    eHoldingsPackages.waitLoading();
  },
  verifySelectionStatusSelected: (status) => {
    cy.expect(selectionStatusAccordion.find(RadioButton(status)).has({ checked: true }));
  },
  toggleSelectionStatusAccordion: () => {
    cy.do(selectionStatusAccordion.clickHeader());
  },
  verifySelectionStatusAccordionOpen: (isOpen = true) => {
    cy.expect(selectionStatusAccordion.has({ open: isOpen }));
  },
  byPackageAccess: (access) => {
    cy.do(packageAccessAccordion.clickHeader());
    cy.do(packageAccessAccordion.find(RadioButton(access)).click());
    eHoldingsPackages.waitLoading();
  },
  verifyPackageAccessOptions: (options) => {
    cy.do(packageAccessAccordion.clickHeader());
    options.forEach((option) => {
      cy.expect(packageAccessAccordion.find(RadioButton(option)).exists());
    });
  },
  resetPackageAccessFilter: () => {
    cy.do(packageAccessAccordion.find(Button({ icon: 'times-circle-solid' })).click());
    eHoldingsPackages.waitLoading();
  },
  verifyPackageAccessSelected: (access) => {
    cy.expect(packageAccessAccordion.find(RadioButton(access)).has({ checked: true }));
  },
  togglePackageAccessAccordion: () => {
    cy.do(packageAccessAccordion.clickHeader());
  },
  verifyPackageAccessAccordionOpen: (isOpen = true) => {
    cy.expect(packageAccessAccordion.has({ open: isOpen }));
  },
  byName(name = '*') {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(name));
    cy.do(Button('Search').click());
    eHoldingsPackages.waitLoading();
  },
  byTag: (specialTag) => {
    cy.do(tagsAccordion.clickHeader());
    cy.do(tagsAccordion.find(byTagCheckbox).click());
    cy.do(tagsAccordion.find(MultiSelect()).filter(specialTag));
    cy.do(tagsAccordion.find(MultiSelectOption(specialTag)).click());
    eHoldingsPackages.waitLoading();
  },
  verifyTagAbsent(specialTag) {
    cy.do([
      tagsAccordion.clickHeader(),
      tagsAccordion.find(byTagCheckbox).click(),
      tagsAccordion.find(byTagCheckbox).click(),
      tagsAccordion.find(Button({ ariaLabel: 'open menu' })).click(),
    ]);
    cy.expect(tagsAccordion.find(MultiSelectOption(including(specialTag))).absent());
  },
  resetTagFilter: () => {
    cy.do(tagsAccordion.find(Button({ icon: 'times-circle-solid' })).click());
  },

  openAccessStatusTypesDropdown() {
    cy.do(accessStatusTypesAccordion.clickHeader());
    // for unclear reasons, clicking the checkbox twice is required to set it to checked state
    cy.do(accessStatusTypesAccordion.find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(accessStatusTypesAccordion.find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(accessStatusTypesAccordion.find(MultiSelect()).open());
  },

  checkAccessStatusTypeOptionAvailable: (accessStatusType, isShown = true) => {
    const targetOption = accessStatusTypesAccordion.find(MultiSelectOption(accessStatusType));
    if (isShown) cy.expect(targetOption.exists());
    else cy.expect(targetOption.absent());
  },

  checkResultsListShown: (isShown = true) => {
    const result = resultSection.find(ListItem({ className: including('list-item-'), index: 0 }));
    if (isShown) cy.expect(result.find(Button()).exists());
    else {
      cy.expect([
        result.absent(),
        resultSection
          .find(HTML(or('No packages found.', 'Enter a query to show search results.')))
          .exists(),
      ]);
    }
  },

  selectAccessStatusType(accessStatusType) {
    cy.do(accessStatusTypesAccordion.find(MultiSelectOption(accessStatusType)).clickSegment());
  },

  verifyResultsCount(expectedCount) {
    cy.expect(resultSection.find(List()).has({ count: expectedCount }));
  },

  verifyTagPresentInFilter(tagValue, openDropdown = true) {
    if (openDropdown) {
      cy.do([
        tagsAccordion.clickHeader(),
        tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
        tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
        tagsAccordion.find(Button({ ariaLabel: 'open menu' })).click(),
      ]);
    }
    cy.do(tagsAccordion.find(MultiSelect()).filter(tagValue));
    cy.expect(tagsAccordion.find(MultiSelectOption(including(tagValue))).exists());
  },
};
