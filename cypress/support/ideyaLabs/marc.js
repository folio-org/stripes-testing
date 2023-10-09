import {
  Accordion,
  Button,
  PaneHeader,
  Section,
  Spinner,
  TextField,
  including,
  Checkbox,
  KeyValue,
  Select,
  SearchField,
  QuickMarcEditorRow,
  Callout,
} from '../../../interactors';
import holdingsRecordView from '../fragments/inventory/holdingsRecordView';

const rootSection = Section({ id: 'marc-view-pane' });
const filterSection = Section({ id: 'pane-filter' });
const saveAndCloseBtn = Button('Save & close');
const closeButton = Button({
  ariaLabel: 'Close The !!!Kung of Nyae Nyae / Lorna Marshall.',
});
const buttonLink = Button({ icon: 'unlink' });
const editorSection = Section({ id: 'quick-marc-editor-pane' });
const linkHeadingsButton = Button('Link headings');
const searchButton = Button({ type: 'submit' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const deleteButtonInConfirmation = Button({
  id: 'clickable-delete-confirmation-modal-confirm',
});
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const customLabelButton = Button('Custom labels');
const displayLabel = TextField({ name: 'customLabel1.displayLabel' });
const displayLabelOne = TextField({ name: 'customLabel2.displayLabel' });
const fullTextFinderCheckbox = Checkbox({
  name: 'customLabel2.displayOnFullTextFinder',
});
const saveButton = Button('Save');
const verifyCustomLabel = Section({ id: 'resourceShowCustomLabels' });
const RandomValue = Math.floor(Math.random() * 2);

export default {
  openCreatedHoldingView: () => {
    cy.get('[class^="button-"][id^="clickable-view-holdings-"]').last().click();
  },

  deleteHolding: () => {
    cy.do([actionsButton.click(), deleteButton.click(), deleteButtonInConfirmation.click()]);
  },

  clickLinkHeadings: () => {
    cy.do(linkHeadingsButton.click());
  },

  printButton: () => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Print').click());
  },

  searchByValue: (value) => {
    cy.do(filterSection.find(TextField({ id: 'input-inventory-search' })).fillIn(value));
    searchButton.click();
  },

  saveAndClose() {
    cy.do(saveAndCloseBtn.click());
  },

  closeMark: () => {
    cy.do(closeButton.click());
  },

  popupUnlinkButton: () => {
    cy.do(Button('Unlink').click());
  },

  keepLinkingButton: () => {
    cy.do(Button('Keep linking').click());
  },

  closeEditMarc: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  crossIcon: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  create006Tag: () => {
    cy.get('.quickMarcEditorAddField:last').click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find('input')
      .then(([tag]) => {
        cy.wrap(tag).type('006');
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select('a');
  },

  create007Tag: () => {
    cy.get('.quickMarcEditorAddField:last').click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find('input')
      .then(([tag]) => {
        cy.wrap(tag).type('007');
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select('a');
  },

  recordLastUpdated: () => {
    cy.expect(Spinner().absent());
    cy.do(
      Accordion('Administrative data')
        .find(Button(including('Record last updated')))
        .click(),
    );
  },

  checkFieldContentMatch() {
    cy.wrap(Accordion({ headline: 'Update information' }).text()).as('message');
    cy.get('@message').then((val) => {
      const sourceRegex = /Source: [^\n]*/;
      const sourceLineMatch = val.match(sourceRegex);
      const sourceText = sourceLineMatch ? sourceLineMatch[0].slice(8) : '';
      const words = sourceText.split(', ');
      const swappedString = words.join(', ');
      holdingsRecordView.editInQuickMarc();
      cy.expect(
        PaneHeader({ id: 'paneHeaderquick-marc-editor-pane' }).has({
          text: including(`Source: ${swappedString}`),
        }),
      );
    });
  },

  customLabel(name) {
    cy.do([
      customLabelButton.click(),
      displayLabel.fillIn(name.labelOne),
      displayLabelOne.fillIn(name.labelTwo),
      fullTextFinderCheckbox.click(),
      saveButton.click(),
    ]);
    cy.visit('/eholdings/resources/58-473-185972');
  },

  verifyCustomLabel: () => {
    cy.expect(verifyCustomLabel.exists());
  },

  checkEmptyTitlesList: () => {
    // eslint-disable-next-line no-undef
    cy.expect(titlesSection.find(KeyValue('Records found', { value: '0' })));
  },

  editactions: () => {
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.wait(2000);
    // eslint-disable-next-line no-undef
    cy.do(editButton.click());
  },

  changeProxy: () => {
    cy.get('select#eholdings-proxy-id option:selected')
      .invoke('text')
      .then((text) => {
        const options = availableProxies.filter((option) => option !== text);
        cy.do(proxySelect.choose(options[RandomValue]));
      });
  },

  selectSearchResultByRowIndex(indexRow) {
    cy.do(this.getSearchResult(indexRow, 0).click());
    // must wait page render
    cy.wait(2000);
  },

  searchBeats(value) {
    cy.do(SearchField({ id: 'textarea-authorities-search' }).fillIn(value));
    cy.do(Button({ id: 'submit-authorities-search' }).click());
  },
  checkFieldTagExists: () => {
    cy.expect([editorSection.exists(), QuickMarcEditorRow({ tagValue: '625' }).exists()]);
  },

  checkLinkingAuthority650: () => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout('Field 650 has been linked to a MARC authority record.').exists());
  },

  checkLinkingAuthority700: () => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout('Field 700 has been linked to a MARC authority record.').exists());
  },
};
