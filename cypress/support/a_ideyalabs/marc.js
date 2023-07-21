import {
  Button,
  QuickMarcEditorRow,
  Section,
  TextField,
} from '../../../interactors';
import section from '../../../interactors/section';
import holdingsRecordView from '../fragments/inventory/holdingsRecordView';

const rootSection = Section({ id: 'marc-view-pane' });
const tagNumber = TextField({ name: 'records[5].tag' });
const filterSection = Section({ id: 'pane-filter' });
const saveAndCloseBtn = Button('Save & close');
const close = Button({ ariaLabel: 'Close The !!!Kung of Nyae Nyae / Lorna Marshall.' });
const linkHeadingsButton = Button('Link headings');
const searchButton = Button({ type: 'submit' });

export default {

  clickLinkheadings: () => {
    cy.do(linkHeadingsButton.click());
  },
  printButton: () => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Print').click());
  },

  assertTagNumber: () => {
    cy.do([cy.expect(tagNumber.find(content).exists())]);
  },

  searchByValue: (value) => {
    cy.do(
      filterSection
        .find(TextField({ id: 'input-inventory-search' }))
        .fillIn(value)
    );
    searchButton.click();
  },

  saveAndClose() {
    cy.do(saveAndCloseBtn.click());
  },

  closeMark: () => {
    cy.do(close.click());
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
    cy.do(section({ id:'acc01' }).find(Button).click());
  },

  checkFieldContentMatch() {
    cy.xpath('//div[contains(text(),"Record created: ")]/following-sibling::*//a')
      .then(($txt) => {
        const actualContent = $txt.text().slice(0, 19);
        cy.log(actualContent);
        holdingsRecordView.editInQuickMarc();
        cy.xpath('//div[@class="quickMarcRecordInfoWrapper---C70k7"]').then(($ele) => {
          const expectedContent = $ele.text().slice(59, 78);
          cy.log(expectedContent);
          expect(actualContent).to.equal(expectedContent);
        });
      });
  },

  verifyTagFieldAfterLinking(rowIndex, tag, secondBox, thirdBox, content, eSubfield, zeroSubfield, seventhBox) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].tag` })).has({ disabled: true, value: tag }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[0]` })).has({ disabled: true, value: secondBox }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[1]` })).has({ disabled: true, value: thirdBox }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` })).has({ disabled: true, value: content }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` })).has({ disabled: false, value: eSubfield }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` })).has({ disabled: true, value: zeroSubfield }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` })).has({ disabled: false, value: seventhBox }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ value: '$9' })).absent(),
    ]);
  },

};
