import {
  Accordion,
  Button,
  ListItem,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  RadioButton,
  Section,
  Spinner,
  TextField,
  including,
  MultiSelect,
  MultiSelectOption,
  HTML,
  ValueChipRoot,
  DropdownMenu,
  Checkbox,
} from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';
import { FILTER_STATUSES } from './eholdingsConstants';
import getRandomPostfix from '../../utils/stringTools';

// eslint-disable-next-line import/no-cycle
const resultSection = Section({ id: 'search-results' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});
const packagesSection = Section({ id: 'providerShowProviderList' });
const packagesActionsButton = packagesSection.find(Button('Actions'));
const packagesAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderList',
});
const packagesList = MultiColumnList({ id: 'provider-package-list' });
const tagsAccordion = Button({ id: 'accordion-toggle-button-providerShowTags' });
const providerAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderSettings',
});
const providerInfAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderInformation',
});
const tagsSection = Section({ id: 'providerShowTags' });
const closeButton = Button({ icon: 'times' });
const packagesSearchField = packagesSection.find(TextField({ name: 'search' }));

export default {
  waitLoading: () => {
    cy.expect(
      resultSection
        .find(ListItem({ className: including('list-item-'), index: 1 }).find(Button()))
        .exists(),
    );
  },

  viewProvider: (rowNumber = 0) => {
    cy.do(
      resultSection
        .find(ListItem({ className: including('list-item-'), index: rowNumber }))
        .find(Button())
        .click(),
    );
    eHoldingsProviderView.waitLoading();
  },

  clickActionsButtonInPackagesSection() {
    cy.expect(packagesActionsButton.exists());
    // wait for titles section to be loaded
    cy.wait(2000);
    cy.do(packagesActionsButton.click());
    cy.expect(DropdownMenu().exists());
  },

  searchPackageByName(packageName) {
    cy.expect(packagesActionsButton.exists());
    cy.do(packagesSearchField.fillIn(packageName));
    cy.intercept('GET', '**/eholdings/providers/*/packages?**').as('getPackages');
    cy.get('input[type="search"]').type('{enter}');
    cy.wait('@getPackages').its('response.statusCode').should('eq', 200);
    this.verifyPackagesSearchQuery(packageName);
    cy.expect(packagesSection.find(Spinner()).absent());
  },

  verifyPackagesSearchQuery(query) {
    cy.expect(packagesSearchField.has({ value: query }));
  },

  bySelectionStatus(selectionStatus) {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  viewPackage: (rowNumber = 0) => {
    cy.expect(Spinner().absent);
    cy.do(
      resultSection
        .find(ListItem({ className: including('list-item-'), index: rowNumber }))
        .find(Button())
        .click(),
    );
  },

  bySelectionStatusOpen(selectionStatus) {
    cy.do(DropdownMenu().find(RadioButton(selectionStatus)).click());
  },

  verifyOnlySelectedPackagesInResults() {
    cy.expect([
      packagesList
        .find(MultiColumnListCell({ content: including(FILTER_STATUSES.SELECTED) }))
        .exists(),
      packagesList
        .find(MultiColumnListCell({ content: including(FILTER_STATUSES.NOT_SELECTED) }))
        .absent(),
    ]);
  },

  verifyProviderHeaderTitle: (title) => {
    cy.expect(PaneHeader(title).exists());
  },

  verifyPackagesAccordionExpanded(open) {
    cy.expect(packagesAccordion.has({ ariaExpanded: open }));
  },

  verifyPackagesAvailable(rowNumber = 0) {
    cy.expect(packagesList.find(MultiColumnListRow({ index: rowNumber })).exists());
  },

  packageAccordionClick() {
    cy.expect(packagesAccordion.exists());
    cy.do([packagesAccordion.click()]);
    cy.expect(Spinner().absent());
  },

  verifyAllAccordionsExpandAndCollapseClick(name, open) {
    cy.expect(Button(name).exists());
    cy.do(Button(name).click());
    cy.expect([
      packagesAccordion.has({ ariaExpanded: open }),
      tagsAccordion.has({ ariaExpanded: open }),
      providerAccordion.has({ ariaExpanded: open }),
      providerInfAccordion.has({ ariaExpanded: open }),
    ]);
  },

  addTag: (newTag = `tag${getRandomPostfix()}`) => {
    cy.then(() => tagsSection.find(MultiSelect()).selected()).then(() => {
      cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
      cy.do(MultiSelectOption(`Add tag for: ${newTag}`).click());
    });
    return newTag;
  },

  removeTag(tag) {
    cy.xpath(
      `//div[contains(text(), '${tag}')]/../../button[contains(@class, 'iconButton')]`,
    ).click();
  },

  verifyPackageWithTag(packageName, tagName) {
    cy.expect(
      packagesList
        .find(MultiColumnListRow({ content: including(packageName), isContainer: false }))
        .find(MultiColumnListCell({ content: including(tagName) }))
        .exists(),
    );
  },

  verifyExistingTags: (...expectedTags) => {
    cy.wait(1000);
    cy.then(() => tagsAccordion.ariaExpanded()).then((isExpanded) => {
      if (isExpanded === 'false') {
        cy.do(tagsAccordion.click());
        cy.wait(1000);
      }
    });
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
        cy.wait(500);
      });
      cy.do(providerAccordion.click());
      cy.wait(2000);
    });
  },

  getProvidersViaApi: (searchParams = { count: 100, pageSize: 100 }) => {
    return cy
      .okapiRequest({
        path: 'eholdings/providers',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.data
          .filter((provider) => provider?.id && provider?.attributes?.name)
          .map((provider) => ({
            id: provider.id,
            name: provider.attributes.name,
          }));
      });
  },

  toggleShowColumnsOption(columnName, { isChecked = true } = {}) {
    this.clickActionsButtonInPackagesSection();
    const targetCheckbox = DropdownMenu().find(Checkbox(columnName));
    cy.do(isChecked ? targetCheckbox.checkIfNotSelected() : targetCheckbox.uncheckIfSelected());
    cy.do(packagesActionsButton.click());
    cy.expect(DropdownMenu().absent());
  },
};
