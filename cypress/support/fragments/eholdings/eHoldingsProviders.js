import {
  Accordion,
  Button,
  KeyValue,
  ListItem,
  RadioButton,
  Section,
  Spinner,
  TextField,
  including
} from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';
// eslint-disable-next-line import/no-cycle
const resultSection = Section({ id: 'search-results' });
const searchButton = Button('Search');
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

  getSubjectValue: () => cy.then(() => KeyValue('Subjects').value()),
  subjectsAssertion() {
    this.getSubjectValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },

  titlesSearch: () => {
    cy.expect(Button({ icon: 'search' }).exists());
    cy.do(Button({ icon: 'search' }).click());
    cy.expect(TextField({ id: 'eholdings-search' }).exists());
    cy.do([
      TextField({ id: 'eholdings-search' }).fillIn('engineering'),
      searchButton.click(),
    ]);
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
