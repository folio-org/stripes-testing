import {
  Button,
  Checkbox,
  Section,
  HTML,
  including,
  PaneHeader,
  Pane,
  Modal,
  MultiColumnList,
  MultiColumnListCell
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix from '../../utils/stringTools';
import JobProfiles from './job_profiles/jobProfiles';
import SearchInventory from './searchInventory';
import TopMenu from '../topMenu';
import DataImportUploadFile from '../../../../interactors/dataImportUploadFile';

const sectionPaneJobsTitle = Section({ id: 'pane-jobs-title' });
const actionsButton = Button('Actions');
const deleteLogsButton = Button('Delete selected logs');
const jobLogsList = MultiColumnList({ id: 'job-logs-list' });
const selectAllCheckbox = Checkbox({ name: 'selected-all' });
const deleteLogsModal = Modal('Delete data import logs?');
const deleteLogsModalCancelButton = deleteLogsModal.find(Button('No, do not delete'));
const deleteLogsModalConfirmButton = deleteLogsModal.find(Button('Yes, delete'));
const logsPane = Pane('Logs');
const logsPaneHeader = PaneHeader({ id: 'paneHeaderpane-logs-title' });
const jobsPane = Pane({ id: 'pane-jobs-title' });

const uploadFile = (filePathName, fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
};

const wailtLoading = () => {
  cy.expect(sectionPaneJobsTitle.exists());
  cy.expect(sectionPaneJobsTitle.find(HTML(including('Loading'))).absent());
  cy.expect(logsPaneHeader.find(actionsButton).exists());
};

export default {
  uploadFile,
  wailtLoading,

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  uploadMarcBib: () => {
    // unique file name to upload
    const nameForMarcFileWithBib = `autotest1Bib${getRandomPostfix()}.mrc`;
    // upload a marc file for export
    cy.visit(TopMenu.dataImportPath);
    uploadFile('oneMarcBib.mrc', nameForMarcFileWithBib);
    JobProfiles.searchJobProfileForImport(JobProfiles.defaultInstanceAndSRSMarcBib);
    JobProfiles.runImportFile(nameForMarcFileWithBib);

    // get Instance HRID through API
    SearchInventory.getInstanceHRID()
      .then(id => {
        cy.wrap(id).as('requestedHrId');
      });
    return cy.get('@requestedHrId');
  },

  getLinkToAuthority: (title) => cy.then(() => Button(title).href()),

  // delete file if it hangs unimported before test
  checkUploadState: () => {
    cy.allure().startStep('Delete files before upload file');
    cy.visit(TopMenu.dataImportPath);
    wailtLoading();
    cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(isDeleteFilesButtonExists => {
      if (isDeleteFilesButtonExists) {
        cy.do(Button('Delete files').click());
        cy.expect(Button('or choose files').exists());
        cy.allure().endStep();
      }
    });
  },

  checkIsLandingPageOpened: () => {
    cy.expect(jobsPane.find(Button('or choose files')).exists());
    cy.expect(logsPaneHeader.find(actionsButton).exists());
  },

  cancelDeleteImportLogs: () => {
    cy.do(deleteLogsModalCancelButton.click());

    cy.expect(deleteLogsModal.absent());
  },

  confirmDeleteImportLogs: () => {
    cy.do(deleteLogsModalConfirmButton.click());

    cy.expect(deleteLogsModal.absent());
  },

  checkMultiColumnListRowsCount: count => {
    cy.expect(jobLogsList.has({ rowCount: count }));
  },

  getLogsHrIdsFromUI: (logsCount = 25) => {
    const hrIdColumnIndex = 7;
    const cells = [];

    new Array(logsCount).fill(null).forEach((_, index) => {
      cy.do(jobLogsList
        .find(MultiColumnListCell({ row: index, columnIndex: hrIdColumnIndex }))
        .perform((element) => {
          cells.push(element?.textContent);
        }));
    });

    return cy.wrap(cells);
  },

  openActionsMenu: () => cy.do(actionsButton.click()),

  openDeleteImportLogsModal: () => {
    cy.do([
      actionsButton.click(),
      deleteLogsButton.click(),
    ]);

    cy.expect(deleteLogsModal.exists());
  },

  selectAllLogs: () => cy.do(selectAllCheckbox.click()),

  selectLog: (row = 0) => {
    cy.do(jobLogsList
      .find(MultiColumnListCell({ row, columnIndex: 0 }))
      .find(Checkbox()).click());
  },

  verifyDataImportLogsDeleted(oldLogsHrIds) {
    cy.get('body').then($body => {
      if (!$body.find('#job-logs-list').length) {
        cy.expect(jobLogsList.absent());
        return;
      }

      cy.expect(selectAllCheckbox.is({ disabled: false }));

      // since data import landing page displays latest 25 logs at a time,
      // when there are more than 25 logs and after deleting current logs, new logs will be displayed.
      // so we need to verify that the hrIds of new logs are different from those of previous logs.
      this.getLogsHrIdsFromUI().then(newLogsHrIds => {
        const isLogsDeleted = newLogsHrIds.every(log => !oldLogsHrIds.includes(log));

        expect(isLogsDeleted).to.equal(true);
      });
    });
  },

  verifyAllLogsCheckedStatus: ({ logsCount = 25, checked = true }) => {
    new Array(logsCount).fill(null).forEach((_, index) => {
      cy.expect(jobLogsList
        .find(MultiColumnListCell({ row: index, columnIndex: 0 }))
        .find(Checkbox())
        .is({ checked }));
    });
  },

  verifyLogsPaneSubtitleExist: (count = 25) => {
    const subtitle = `${count} log${count > 1 ? 's' : ''} selected`;

    cy.expect(logsPane.has({ subtitle }));
  },

  verifyLogsPaneSubtitleAbsent: () => {
    cy.expect(logsPane.find(HTML(including('selected'))).absent());
  },

  verifyDeleteLogsButtonDisabled: () => {
    cy.do(actionsButton.click());

    cy.expect(deleteLogsButton.is({ disabled: true }));
  },
};
