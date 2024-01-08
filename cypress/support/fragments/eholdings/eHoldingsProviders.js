import {
  Accordion,
  Button,
  ListItem,
  PaneHeader,
  RadioButton,
  Section,
  Spinner,
  including,
} from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';
import { FILTER_STATUSES } from './eholdingsConstants';

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
};
