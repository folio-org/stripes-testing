import {
  Button,
  including,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  PaneHeader,
  Section,
} from '../../../../interactors';
import { VOUCHER_LINES_TABLE_COLUMN_HEADERS } from '../../constants';

const voucherPane = Section({ id: 'pane-voucher' });
const voucherPaneHeader = PaneHeader({ id: 'paneHeaderpane-voucher' });
const voucherInformationSection = voucherPane.find(Section({ id: 'voucher' }));
const voucherLinesSection = voucherPane.find(Section({ id: 'voucherLines' }));

export default {
  waitLoading() {
    cy.expect(voucherPane.exists());
  },
  checkVoucherDetails({
    voucherInformation = [],
    voucherLines,
    externalAccountNumber,
    total,
  } = {}) {
    voucherInformation.forEach(({ key, value }) => {
      cy.expect(voucherInformationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (voucherLines) {
      this.checkVoucherLinesTableContent(voucherLines);
    }

    if (externalAccountNumber) {
      cy.expect(
        voucherLinesSection.has({
          text: including(`External account number: ${externalAccountNumber}`),
        }),
      );
    }

    if (total) {
      cy.expect(voucherLinesSection.has({ text: including(`Total: ${total}`) }));
    }
  },
  checkVoucherLineColumnItem(rowIndex, columnName, value) {
    cy.expect(
      voucherLinesSection
        .find(MultiColumnListCell({ row: rowIndex, column: columnName }))
        .has({ content: including(value) }),
    );
  },
  checkVoucherLinesTableContent(records = []) {
    cy.expect(
      voucherLinesSection
        .find(MultiColumnList())
        .has({ columns: Object.values(VOUCHER_LINES_TABLE_COLUMN_HEADERS) }),
    );

    records.forEach((record, index) => {
      if (record.lineNumber) {
        this.checkVoucherLineColumnItem(
          index,
          VOUCHER_LINES_TABLE_COLUMN_HEADERS.LINE_NUMBER,
          record.lineNumber,
        );
      }

      if (record.fundCode) {
        this.checkVoucherLineColumnItem(
          index,
          VOUCHER_LINES_TABLE_COLUMN_HEADERS.FUND_CODE,
          record.fundCode,
        );
      }

      if (record.externalAccountNumber) {
        this.checkVoucherLineColumnItem(
          index,
          VOUCHER_LINES_TABLE_COLUMN_HEADERS.EXTERNAL_ACCOUNT_NUMBER,
          record.externalAccountNumber,
        );
      }

      if (record.amount) {
        this.checkVoucherLineColumnItem(
          index,
          VOUCHER_LINES_TABLE_COLUMN_HEADERS.AMOUNT,
          record.amount,
        );
      }
    });
  },
  closeVoucher() {
    cy.do(voucherPaneHeader.find(Button({ icon: 'times' })).click());
    cy.expect(voucherPane.absent());
  },
};
