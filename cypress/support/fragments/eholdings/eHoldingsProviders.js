import {
  Accordion,
  Button,
  FieldSet,
  KeyValue,
  ListItem,
  MultiSelect,
  NavListItem,
  RadioButton,
  Section,
  Spinner,
  TextArea,
  TextField,
  including,
} from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import TopMenu from '../topMenu';
import eholdingsPackagesSearch from './eHoldingsPackagesSearch';
import eHoldingsProviderView from './eHoldingsProviderView';
// eslint-disable-next-line import/no-cycle
import eHoldingsProvidersSearch from './eHoldingsProvidersSearch';
import eHoldingsSearch from './eHoldingsSearch';

const resultSection = Section({ id: 'search-results' });
const description = TextArea({ name: 'description' });
const saveAndClose = Button('Save & close');
const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const packageList = Section({ id: 'packageShowTitles' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});

export const randomTwoDigitNumber = () => Math.floor(Math.random() * 2);

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

  PackageAccordianClick() {
    cy.do([
      Button({
        id: 'accordion-toggle-button-providerShowProviderList',
      }).click(),
    ]);
  },

  PackageButtonClick(name) {
    cy.do([Button(name).click()]);
  },

  SwitchToPackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('JSTOR');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  SwitchToPackageandsearch() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Wiley Online Library');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  editactions() {
    cy.expect(actionsButton.exists());
    cy.do([actionsButton.click(), editButton.click()]);
  },

  searchActions() {
    cy.do(searchButton.click());
  },

  patronRadiobutton: () => {
    cy.do([
      FieldSet('Show titles in package to patrons')
        .find(RadioButton({ checked: false }))
        .click(),
    ]);
  },

  editDateRange: () => {
    cy.expect(Spinner().absent());
    cy.do([
      TextField({ id: 'begin-coverage-0' }).fillIn(
        dateTools.getTomorrowDayDateForFiscalYear(randomTwoDigitNumber())
      ),
      TextField({ id: 'end-coverage-0' }).fillIn(
        dateTools.getDayAfterTomorrowDayDateForFiscalYear(
          randomTwoDigitNumber()
        )
      ),
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

  getSubjectValue: () => cy.then(() => KeyValue('Subjects').value()),
  subjectsAssertion() {
    this.getSubjectValue().then((val) => expect(val).to.be.exist);
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
  SwitchTopackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider('Gale Cengage');
  },
};
