import {
  Button,
  Callout,
  KeyValue,
  Modal,
  PaneHeader,
  RadioButton,
  Section,
  TextField,
} from '../../../../interactors';
import exportManagerSearchPane from '../exportManager/exportManagerSearchPane';
import topMenu from '../topMenu';

const actionsButton = Button('Actions');
const titlesSection = Section({ id: 'packageShowTitles' });
const searchIcon = Button({ icon: 'search' });
const filterTitlesModal = Modal({ id: 'eholdings-details-view-search-modal' });
const titlesSearchField = TextField({ id: 'eholdings-search' });
const selectionStatusButton = Button('Selection status');
const notSelectedRadioButton = RadioButton('Not selected');
const searchButton = Button('Search');

export default {
  exportsPackageCSVClick: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Export package (CSV)').click());
  },

  filterTitles: (title) => {
    cy.do([
      titlesSection.find(searchIcon).click(),
      filterTitlesModal.find(titlesSearchField).fillIn(title),
      filterTitlesModal.find(selectionStatusButton).click(),
      filterTitlesModal.find(notSelectedRadioButton).click(),
      filterTitlesModal.find(searchButton).click(),
    ]);
  },

  verifyJobIDRecord() {
    cy.expect(Callout({ type: 'success' }).exists());
    cy.wrap(Callout({ type: 'success' }).text()).as('message');
    cy.get('@message').then((val) => {
      const message = val.slice(31, 37);
      cy.visit(topMenu.exportManagerPath);
      exportManagerSearchPane.searchBySuccessful();
      exportManagerSearchPane.downloadLastCreatedJob(message);
    });
  },

  getFileName: () => cy.then(() => KeyValue('File name').value()),

  verifyFileName(fileName) {
    this.getFileName().then((val) => {
      expect(val).to.include(fileName);
    });
  },

  verifyThirdPaneExportJobExist() {
    cy.expect(PaneHeader('Export jobs').exists());
  },
};
