import { Section, MultiColumnListCell, Button } from '../../../../interactors';
import NewLicense from './newLicense';
import SearchAndFilterLicenses from './searchAndFilterLicenses';

const licensesFilterSection = Section({ id: 'pane-license-filters' });
const licensesSection = Section({ id: 'pane-license-list' });
const newButton = Button('New');
const actionsButton = Button('Actions');

export default {
  waitLoading: () => {
    cy.expect(licensesFilterSection.exists());
  },

  createNewLicense(license) {
    cy.do(licensesSection.find(actionsButton).click());
    cy.do(newButton.click());
    NewLicense.waitLoading();
    NewLicense.fillDefault(license);
    NewLicense.save();
  },

  checkLicensePresented: (license) => {
    SearchAndFilterLicenses.search(license.name);
    cy.expect(MultiColumnListCell(license.name).exists());
  },

  selectRecord(licenseName) {
    cy.do(MultiColumnListCell({ content: licenseName }).click());
  },
};
