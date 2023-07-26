import {
  Accordion,
  Button,
  ListItem,
  MultiSelect,
  NavListItem,
  RadioButton,
  Section,
  Spinner,
  TextArea,
  including,
} from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';
// eslint-disable-next-line import/no-cycle

const resultSection = Section({ id: 'search-results' });
const description = TextArea({ name: 'description' });
const saveAndClose = Button('Save & close');
const packageList = Section({ id: 'packageShowTitles' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});

export default {
  waitLoading: () => {
    cy.expect(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: 1 }).find(
            Button()
          )
        )
        .exists()
    );
  },

  viewProvider: (rowNumber = 0) => {
    cy.do(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
    eHoldingsProviderView.waitLoading();
  },

  editSchedule({ data }) {
    cy.do([
      NavListItem(data.name).click(),
      Button('Actions').click(),
      Button('Edit').click(),
      description.fillIn(data.description),
      saveAndClose.click(),
    ]);
  },

  DropdownValuesSelect(names) {
    cy.do(MultiSelect().select(names));
  },

  bySelectionStatus(selectionStatus) {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  clickSearchTitles: (rowNumber = 0) => {
    cy.do(
      packageList
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
  },

  viewPackage: (rowNumber = 0) => {
    cy.expect(Spinner().absent);
    cy.do(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
  },

  bySelectionStatusOpen(selectionStatus) {
    cy.do(selectionStatusSection.find(Button('Selection status')).click());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },
};
