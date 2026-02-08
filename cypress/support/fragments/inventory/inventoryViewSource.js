import { HTML, including, or } from '@interactors/html';
import {
  Button,
  Section,
  TableRow,
  PaneHeader,
  Tooltip,
  Spinner,
  DropdownMenu,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const instanceTitle = 'MARC bibliographic record';
const holdingTitle = 'Holdings record';
const rootSection = Section({ id: 'marc-view-pane' });
const closeButton = rootSection.find(Button({ icon: 'times' }));
const linkedToMarcAuthorityIcon = Button({ href: including('/marc-authorities/authorities/') });
const versionHistoryButton = Button({ icon: 'clock' });
const versionHistoryToolTipText = 'Version history';
const actionsButton = rootSection.find(Button('Actions', { disabled: or(true, false) }));
const editButton = Button({ id: 'edit-marc' });
const printButton = Button({ id: 'print-marc' });
const exportButton = Button({ id: 'quick-export-trigger' });

const close = () => cy.do(closeButton.click());
const editMarcBibRecord = () => {
  cy.wait(1000);
  cy.do(actionsButton.click());
  cy.wait(1500);
  cy.do(editButton.click());
};
const contains = (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists());
const rowEquals = (rowIndex, expectedText) => cy.expect(rootSection.find(TableRow({ index: rowIndex, innerText: expectedText })).exists());

function extructDataFrom999Field() {
  return cy
    .get('tbody tr')
    .last()
    .then(($el) => {
      const instanceUuid = $el[0].innerText.split('\t')[3].trim().split(' ')[1];
      const srsUuid = $el[0].innerText.split('\t')[3].trim().split(' ')[3];
      return [instanceUuid, srsUuid];
    });
}

export default {
  close,
  editMarcBibRecord,
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

  verifyAbsenceOfValue(expectedText) {
    cy.expect(rootSection.find(HTML(including(expectedText))).absent());
  },

  verifyAbsenceOfValueInRow(expectedText, rowIndex) {
    cy.expect(
      rootSection.find(TableRow({ index: rowIndex, innerText: including(expectedText) })).absent(),
    );
  },

  verifyExistanceOfValueInRow(expectedText, rowIndex) {
    cy.expect(
      rootSection.find(TableRow({ index: rowIndex, innerText: including(expectedText) })).exists(),
    );
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

  verifyLinkedToAuthorityIcon(rowIndex, isPresent = true) {
    if (isPresent) {
      cy.expect(
        rootSection
          .find(TableRow({ index: rowIndex }))
          .find(linkedToMarcAuthorityIcon)
          .exists(),
      );
    } else {
      cy.expect(
        rootSection
          .find(TableRow({ index: rowIndex }))
          .find(linkedToMarcAuthorityIcon)
          .absent(),
      );
    }
  },

  verifyFieldContent: (rowIndex, updatedDate) => {
    cy.get('table')
      .find('tr')
      .eq(rowIndex)
      .find('td')
      .then((elems) => {
        const dateFromField = DateTools.convertMachineReadableDateToHuman(elems.eq(2).text());
        const convertedUpdatedDate = new Date(updatedDate).getTime();
        const convertedDateFromField = new Date(dateFromField).getTime();
        const timeDifference = (convertedDateFromField - convertedUpdatedDate) / 1000;

        // check that difference in time is less than 2 minute
        expect(timeDifference).to.be.lessThan(120000);
      });
  },

  clickViewMarcAuthorityIcon() {
    cy.get('#marc-view-pane').find('a').invoke('removeAttr', 'target').click();
    cy.wait(2000);
  },

  clickVersionHistoryButton() {
    this.waitLoading();
    cy.expect(versionHistoryButton.exists());
    cy.do(versionHistoryButton.click());
    cy.expect(Spinner().exists());
    cy.expect(Spinner().absent());
    this.checkActionsButtonEnabled(false);
  },

  verifyVersionHistoryButtonShown(isShown = true) {
    const targetButton = PaneHeader().find(versionHistoryButton);
    if (isShown) {
      cy.expect(targetButton.exists());
      cy.do(targetButton.hoverMouse());
      cy.expect(Tooltip().has({ text: versionHistoryToolTipText }));
    } else cy.expect(targetButton.absent());
  },

  checkActionsButtonEnabled(isEnabled = true) {
    cy.expect(actionsButton.is({ disabled: !isEnabled }));
  },

  verifyVersionHistoryIcon({ isPresent = true }) {
    if (isPresent) {
      cy.expect(versionHistoryButton.exists());
    } else {
      cy.expect(versionHistoryButton.absent());
    }
  },

  validateOptionsInActionsMenu({ edit = true, print = true, quickExport = true } = {}) {
    cy.do(actionsButton.click());
    if (edit) cy.expect(editButton.exists());
    else cy.expect(editButton.absent());
    if (print) cy.expect(printButton.exists());
    else cy.expect(printButton.absent());
    if (quickExport) cy.expect(exportButton.exists());
    else cy.expect(exportButton.absent());
    cy.do(actionsButton.click());
    cy.expect(DropdownMenu().absent());
  },

  checkRowsCount(expectedCount) {
    cy.expect([
      rootSection.find(TableRow({ index: expectedCount - 1 })).exists(),
      rootSection.find(TableRow({ index: expectedCount })).absent(),
    ]);
  },

  exportInstanceMarc() {
    cy.do([actionsButton.click(), exportButton.click()]);
  },

  getContentFromRow(rowIndex) {
    return cy.then(() => rootSection.find(TableRow({ index: rowIndex })).innerText());
  },

  verifyFieldsOrder(expectedTagsArray) {
    const rows = [];
    cy.then(() => {
      cy.get('table[class^="marc"]').within(() => {
        cy.get('tr').each(($tr) => {
          rows.push($tr.find('td').eq(1).text());
        });
      });
    }).then(() => {
      expect(rows).to.deep.equal(expectedTagsArray);
    });
  },

  verifyFieldsOrderWithLDR(expectedTagsArray) {
    const rows = [];
    cy.then(() => {
      cy.get('table[class^="marc"]').within(() => {
        cy.get('tr').each(($tr) => {
          const tdElements = $tr.find('td');
          if (
            tdElements.eq(0).attr('colspan') === '4' &&
            tdElements.eq(0).text().includes('LEADER')
          ) {
            rows.push('LDR');
          } else {
            rows.push(tdElements.eq(1).text());
          }
        });
      });
    }).then(() => {
      expect(rows).to.deep.equal(expectedTagsArray);
    });
  },
};
