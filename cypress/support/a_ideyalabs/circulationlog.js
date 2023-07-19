
import Button from '../../../interactors/button';
import {
  Checkbox,
  Link,
  MultiColumnListRow,
  PaneContent,
  Section,
  TextField,
} from '../../../interactors';
import button from '../../../interactors/button';
import usersSearchPane from '../fragments/users/usersSearchPane';

const noticeButton = Button('Notice');
const sendCheckBox = Checkbox('Send');
const userBarcodeField = TextField({ name: 'userBarcode' });
const apply = '//span[text()="Apply"]';
const userSearchPaneContent = PaneContent({
  id: 'users-search-results-pane-content',
});

export default {
  clickstatus() {
    usersSearchPane.searchByStatus('Active');

    cy.do([
      userSearchPaneContent
        .find(MultiColumnListRow({ index: 2 }).find(Link('A2L 1, Holly')))
        .click(),
      button({ id: 'accordion-toggle-button-loansSection' }).click(),
      Section({ id:'loansSection' }).find(Link('1 open loan')).click()

    ]);
  },



  noticeDropdown: () => {
    cy.do(noticeButton.click());
  },

  sendOption: () => {
    cy.do(sendCheckBox.click());
  },

  userBarcode: (barcode) => {
    cy.do(userBarcodeField.fillIn(barcode));
  },

  applyButton: () => {
    cy.xpath(apply).eq(0).click();
  },
};
