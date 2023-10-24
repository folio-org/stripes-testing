import {
  Button,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  Select,
  including,
} from '../../../../interactors';
import ConfirmManualExportModal from './modal/confirmManualExportModal';
import InteractorsTools from '../../utils/interactorsTools';

const voucherExportPane = Section({ id: 'pane-voucher-export' });
const voucherExportPaneHeader = voucherExportPane.find(
  PaneHeader({ id: 'paneHeaderpane-voucher-export' }),
);
const voucherExportsTable = MultiColumnList({ id: 'batch-voucher-exports' });
const downloadVoucherButton = Button({ icon: 'download' });

const cancelButtom = Button('Cancel');
const runManualExportButtom = Button('Run manual export');

const buttons = {
  Cancel: cancelButtom,
  'Run manual export': runManualExportButtom,
};

const messages = {
  exportStarted: 'Voucher export has been started successfully',
  downloadedSuccessfully: 'Vouchers have been successfully downloaded',
};

export default {
  waitLoading() {
    cy.expect(voucherExportPane.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  selectBatchGroup({ batchGroup, refresh = false }) {
    if (refresh) {
      cy.reload();
    }
    cy.do(Select().choose(batchGroup));
  },
  checkTableContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.status) {
        cy.expect(
          voucherExportsTable
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: including(record.status) }),
        );
      }

      if (record.message) {
        cy.expect(
          voucherExportsTable
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: including(record.message) }),
        );
      }

      if (record.download) {
        cy.expect(
          voucherExportsTable
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .find(downloadVoucherButton)
            .exists(),
        );
      }
    });
  },
  downloadVoucher({ index = 0 } = {}) {
    cy.do(
      voucherExportsTable
        .find(MultiColumnListRow({ index }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(downloadVoucherButton)
        .click(),
    );

    InteractorsTools.checkCalloutMessage(messages.downloadedSuccessfully);
  },
  closeVoucherExportForm() {
    cy.do(voucherExportPaneHeader.find(Button({ icon: 'times' })).click());
    cy.expect(voucherExportPane.absent());
  },
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(voucherExportPane.absent());
  },
  clickRunManualExportButton() {
    cy.expect(runManualExportButtom.has({ disabled: false }));
    cy.do(runManualExportButtom.click());

    ConfirmManualExportModal.verifyModalView();
    ConfirmManualExportModal.clickContinueButton();

    InteractorsTools.checkCalloutMessage(messages.exportStarted);

    // wait for changes to be applied
    cy.wait(1000);
  },
};
