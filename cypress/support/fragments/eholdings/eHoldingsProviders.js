import {
  Accordion,
  Button,
  ListItem,
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
} from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';
import { FILTER_STATUSES } from './eholdingsConstants';
import getRandomPostfix from '../../utils/stringTools';

// eslint-disable-next-line import/no-cycle
const resultSection = Section({ id: 'search-results' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});
const searchIcon = Button({ icon: 'search' });
const packagesSection = Section({ id: 'providerShowProviderList' });
const packagesAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderList',
});
const tagsAccordion = Button({ id: 'accordion-toggle-button-providerShowTags' });
const providerAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderSettings',
});
const providerInfAccordion = Button({
  id: 'accordion-toggle-button-providerShowProviderInformation',
});
const tagsSection = Section({ id: 'providerShowTags' });
const closeButton = Button({ icon: 'times' });

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

  clickSearchIcon() {
    cy.expect(searchIcon.exists());
    // wait for titles section to be loaded
    cy.wait(2000);
    cy.do(searchIcon.click());
  },

  searchPackageByName(packageName) {
    cy.expect(searchIcon.exists());
    cy.do(searchIcon.click());
    cy.do(TextField({ name: 'search' }).fillIn(packageName));
    cy.do(Button('Search').click());
    cy.expect(Spinner().absent());
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
    cy.do(selectionStatusSection.find(Button('Selection status')).click());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  verifyOnlySelectedPackagesInResults() {
    cy.expect([
      packagesSection.find(ListItem({ text: including(FILTER_STATUSES.SELECTED) })).exists(),
      packagesSection.find(ListItem({ text: including(FILTER_STATUSES.NOT_SELECTED) })).absent(),
    ]);
  },

  verifyProviderHeaderTitle: (title) => {
    cy.expect(PaneHeader(title).exists());
  },

  verifyPackagesAccordionExpanded(open) {
    cy.expect(packagesAccordion.has({ ariaExpanded: open }));
  },

  verifyPackagesAvailable(rowNumber = 0) {
    cy.expect(
      packagesSection
        .find(ListItem({ className: including('list-item-'), index: rowNumber }))
        .find(Button())
        .exists(),
    );
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
    cy.get('[id="providerShowProviderList"]')
      .contains(packageName)
      .parent()
      .parent()
      .parent()
      .should('contain', tagName);
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
};
