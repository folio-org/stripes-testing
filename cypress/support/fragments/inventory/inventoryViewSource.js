import { HTML, including } from '@interactors/html';
import { Button, Section, TableRow } from '../../../../interactors';

const instanceTitle = 'MARC bibliographic record';
const holdingTitle = 'Holdings record';
const closeButton = Button({ icon: 'times' });
const rootSection = Section({ id: 'marc-view-pane' });

const close = () => cy.do(closeButton.click());
const contains = (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists());
const rowEquals = (rowIndex, expectedText) => cy.expect(rootSection.find(TableRow({ index: rowIndex, innerText: expectedText })).exists());

function extructDataFrom999Field() {
  return cy
    .get('tbody tr')
    .last()
    .then(($el) => {
      const srsUuid = $el[0].innerText.split('\t')[3].trim().split(' ')[1];
      const instanceUuid = $el[0].innerText.split('\t')[3].trim().split(' ')[3];
      return [srsUuid, instanceUuid];
    });
}

export default {
  close,
  contains,
  rowEquals,
  extructDataFrom999Field,
  notContains: (notExpectedText) => cy.expect(rootSection.find(HTML(including(notExpectedText))).absent()),
  waitInstanceLoading: () => cy.expect(rootSection.find(HTML(including(instanceTitle))).exists()),
  waitHoldingLoading: () => cy.expect(rootSection.find(HTML(including(holdingTitle))).exists()),
  waitLoading: () => cy.expect(rootSection.exists()),

  verifyBarcodeInMARCBibSource: (itemBarcode) => {
    contains('980\t');
    contains('KU/CC/DI/M');
    contains('981\t');
    contains(itemBarcode);
    close();
  },

  verifyFieldInMARCBibSource: (fieldNumber, content) => {
    contains(fieldNumber);
    contains(content);
  },

  verifyRecordNotContainsDuplicatedContent: (value) => {
    cy.get(`td:contains("${value}")`).then((elements) => elements.length === 1);
  },

  verifyRecordContainsDuplicatedContent: (value, quantity) => {
    cy.get(`td:contains("${value}")`).then((elements) => elements.length === quantity);
  },

  checkFieldContentMatch(tag, regExp) {
    if (tag === 'LDR') {
      cy.xpath('//td[text()[contains(.,"LEADER")]]')
        .invoke('text')
        .then((text) => {
          expect(text).to.match(regExp);
        });
    } else {
      cy.xpath(`//td[text()="${tag}"]/following-sibling::td`)
        .invoke('text')
        .then((text) => {
          expect(text).to.match(regExp);
        });
    }
  },
};
