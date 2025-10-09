import { HTML, including } from '@interactors/html';
import {
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  NavListItem,
  Pane,
  PaneHeader,
  Section,
} from '../../../../interactors';
import DataImportUploadFile from '../../../../interactors/dataImportUploadFile';
import { JOB_STATUS_NAMES } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import FileManager from '../../utils/fileManager';
import MarcAuthorities from '../marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../marcAuthority/marcAuthority';
import TopMenu from '../topMenu';
import JobProfiles from './job_profiles/jobProfiles';
import Logs from './logs/logs';
import { DataImportAPI } from './dataImportAPI';

const sectionPaneJobsTitle = Section({ id: 'pane-jobs-title' });
const actionsButton = Button('Actions');
const deleteLogsButton = Button('Delete selected logs');
const jobLogsList = Pane({ id: 'pane-logs-title' });
const selectAllCheckbox = Checkbox({ name: 'selected-all' });
const deleteLogsModal = Modal('Delete data import logs?');
const deleteLogsModalCancelButton = deleteLogsModal.find(Button('No, do not delete'));
const deleteLogsModalConfirmButton = deleteLogsModal.find(Button('Yes, delete'));
const logsPane = Pane('Logs');
const logsPaneHeader = PaneHeader({ id: 'paneHeaderpane-logs-title' });
const orChooseFilesButton = Button('or choose files');
const cancelImportJobModal = Modal('Cancel import job?');
const cancelMultipleImportJobModal = Modal('Cancel multipart import job?');
const yesButton = Button('Yes, cancel import job');
const cancelButton = Button('No, do not cancel import');
const dataImportNavSection = Pane({ id: 'app-settings-nav-pane' });
const importBlockedModal = Modal('Import blocked');
const inconsistentFileExtensionsModal = Modal('Inconsistent file extensions');

const uploadFile = (filePathName, fileName) => {
  cy.expect(sectionPaneJobsTitle.exists());
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
  cy.wait(15000);
};

// used for production tenants
const uploadFileIfDeleteButtonNotDisplayed = (filePathName, fileName) => {
  cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(
    (isDeleteFilesButtonExists) => {
      if (isDeleteFilesButtonExists) {
        cy.log('Delete Files button is displayed - File upload already in progress. Skipping test');
      } else {
        cy.log('Delete Files button is not displayed');
        cy.expect(sectionPaneJobsTitle.exists());
        cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
        cy.wait(15000);
      }
    },
  );
};

const uploadBunchOfDifferentFiles = (fileNames) => {
  const arrayOfFiles = [];
  for (let i = 0; i < fileNames.length; i++) {
    arrayOfFiles.push(fileNames[i]);
  }
  cy.get('input[type=file]').attachFile(arrayOfFiles);
  cy.wait(5000);
  cy.get('#pane-upload', getLongDelay()).find('div[class^="progressInfo-"]').should('not.exist');
  cy.wait(1500);
};

const uploadBunchOfFiles = (editedFileName, numberOfFiles, finalFileName) => {
  const arrayOfFiles = [];

  for (let i = 0; i < numberOfFiles; i++) {
    FileManager.readFile(`cypress/fixtures/${editedFileName}`).then((actualContent) => {
      const fileName = `${finalFileName + i}.mrc`;

      FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
      arrayOfFiles.push(fileName);
    });
  }
  cy.get('input[type=file]').attachFile(arrayOfFiles);
  cy.get('#pane-upload', getLongDelay()).find('div[class^="progressInfo-"]').should('not.exist');
};

const waitLoading = () => {
  cy.expect(sectionPaneJobsTitle.exists());
  cy.expect(sectionPaneJobsTitle.find(HTML(including('Loading'))).absent());
  cy.expect(logsPaneHeader.find(actionsButton).exists());
};

const getLinkToAuthority = (title) => cy.then(() => Button(title).href());

// file to upload - MarcAuthority.defaultAuthority
// link to visit - defined with the parameter MarcAuthority.defaultAuthority.headingReference
const importFile = (profileName, uniqueFileName) => {
  uploadFile(MarcAuthority.defaultAuthority.name, uniqueFileName);

  JobProfiles.waitLoadingList();
  JobProfiles.select(profileName);
  JobProfiles.runImportFile();
  JobProfiles.waitFileIsImported(uniqueFileName);
  JobProfiles.openFileRecords(uniqueFileName);

  getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then((link) => {
    const jobLogEntriesUid = link.split('/').at(-2);
    const recordId = link.split('/').at(-1);

    cy.intercept({
      method: 'GET',
      url: `/metadata-provider/jobLogEntries/${jobLogEntriesUid}/records/${recordId}`,
    }).as('getRecord');

    cy.visit(link);

    cy.wait('@getRecord', getLongDelay()).then((request) => {
      const internalAuthorityId = request.response.body.relatedAuthorityInfo.idList[0];

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy(
        'Uniform title',
        MarcAuthority.defaultAuthority.headingReference,
      );
      MarcAuthorities.select(internalAuthorityId);
      MarcAuthority.waitLoading();
    });
  });
};

export default {
  ...DataImportAPI,
  importFile,
  uploadFile,
  uploadFileIfDeleteButtonNotDisplayed,
  uploadBunchOfFiles,
  waitLoading,
  uploadBunchOfDifferentFiles,

  // actions
  importFileForBrowse(profileName, fileName) {
    JobProfiles.waitLoadingList();
    JobProfiles.search(profileName);
    JobProfiles.runImportFile();
    Logs.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    Logs.openFileDetails(fileName);
  },

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
    cy.get('div[class^="progressInfo-"]', getLongDelay()).should('not.exist');
  },

  getLinkToAuthority: (title) => cy.then(() => Button(title).href()),

  cancelDeleteImportLogs: () => {
    cy.do(deleteLogsModalCancelButton.click());
    cy.expect(deleteLogsModal.absent());
  },

  confirmDeleteImportLogs: () => {
    cy.do(deleteLogsModalConfirmButton.click());
    cy.expect(deleteLogsModal.absent());
  },

  getLogsHrIdsFromUI: (logsCount = 25) => {
    const hrIdColumnIndex = 9;
    const cells = [];

    new Array(logsCount).fill(null).forEach((_, index) => {
      cy.do(
        jobLogsList
          .find(MultiColumnListCell({ row: index, columnIndex: hrIdColumnIndex }))
          .perform((element) => {
            cells.push(element?.textContent);
          }),
      );
    });

    return cy.wrap(cells);
  },

  openActionsMenu: () => cy.do(actionsButton.click()),

  openDeleteImportLogsModal: () => {
    cy.do([actionsButton.click(), deleteLogsButton.click()]);

    cy.expect(deleteLogsModal.exists());
  },

  selectAllLogs: () => cy.do(selectAllCheckbox.click()),

  selectLog: (row = 0) => {
    cy.do(
      jobLogsList
        .find(MultiColumnListCell({ row, columnIndex: 0 }))
        .find(Checkbox())
        .click(),
    );
  },

  checkMultiColumnListRowsCount: (count) => cy.expect(MultiColumnList().has({ rowCount: count })),

  checkIsLandingPageOpened: () => {
    cy.expect(sectionPaneJobsTitle.find(orChooseFilesButton).exists());
    cy.expect(logsPaneHeader.find(actionsButton).exists());
  },

  editMarcFile(editedFileName, finalFileName, stringToBeReplaced, replaceString) {
    // stringToBeReplaced and replaceString must be array. Array length must be equal
    FileManager.readFile(`cypress/fixtures/${editedFileName}`).then((actualContent) => {
      const content = actualContent.split('\n');
      let firstString = content[0].slice();

      for (let i = 0; i < stringToBeReplaced.length; i++) {
        firstString = firstString.replace(stringToBeReplaced[i], replaceString[i]);
      }

      content[0] = firstString;
      FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
    });
  },

  editMarcFileAddNewRecords(editedFileName, finalFileName, fileWithContentForEdit) {
    FileManager.readFile(`cypress/fixtures/${editedFileName}`).then((actualContent) => {
      const currentContent = actualContent;

      FileManager.readFile(`cypress/fixtures/${fileWithContentForEdit}`).then((content) => {
        const contentForEdit = content;
        const newContent = currentContent.concat(contentForEdit);

        FileManager.createFile(`cypress/fixtures/${finalFileName}`, newContent);
      });
    });
  },

  replace999SubfieldsInPreupdatedFile(exportedFileName, preUpdatedFileName, finalFileName) {
    FileManager.readFile(`cypress/fixtures/${exportedFileName}`).then((actualContent) => {
      const lines = actualContent.split('');
      const field999data = lines[lines.length - 2];
      FileManager.readFile(`cypress/fixtures/${preUpdatedFileName}`).then((updatedContent) => {
        const content = updatedContent.split('\n');
        let firstString = content[0].slice();
        firstString = firstString.replace(
          'ff000000000-0000-0000-0000-000000000000i00000000-0000-0000-0000-000000000000',
          field999data,
        );
        content[0] = firstString;
        FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
      });
    });
  },

  // checks
  verifyDataImportLogsDeleted(oldLogsHrIds) {
    cy.get('body').then(($body) => {
      if (!$body.find('#job-logs-list').length) {
        cy.expect(jobLogsList.absent());
        return;
      }
      cy.expect(selectAllCheckbox.is({ disabled: false }));
      // since data import landing page displays latest 25 logs at a time,
      // when there are more than 25 logs and after deleting current logs, new logs will be displayed.
      // so we need to verify that the hrIds of new logs are different from those of previous logs.
      this.getLogsHrIdsFromUI().then((newLogsHrIds) => {
        const isLogsDeleted = newLogsHrIds.every((log) => !oldLogsHrIds.includes(log));

        expect(isLogsDeleted).to.equal(true);
      });
    });
  },

  verifyAllLogsCheckedStatus: ({ logsCount = 25, checked = true }) => {
    new Array(logsCount).fill(null).forEach((_, index) => {
      cy.expect(
        jobLogsList
          .find(MultiColumnListCell({ row: index, columnIndex: 0 }))
          .find(Checkbox())
          .is({ checked }),
      );
    });
  },

  verifyLogsPaneSubtitleExist: (count = 25) => {
    const subtitle = `${count} log${count > 1 ? 's' : ''} selected`;

    cy.expect(logsPane.has({ subtitle }));
  },

  verifyLogsPaneSubtitleAbsent: () => cy.expect(logsPane.find(HTML(including('selected'))).absent()),
  verifyChooseFileButtonState: ({ isDisabled }) => cy.expect(orChooseFilesButton.has({ disabled: isDisabled })),

  verifyDeleteLogsButtonDisabled: () => {
    cy.wait(1500);
    cy.do(actionsButton.click());
    cy.wait(1500);
    cy.expect(deleteLogsButton.is({ disabled: true }));
  },

  verifyUploadState: () => {
    // multiple users to be running Data Import in the same Tenant at the same time
    // because this is possible by design
    // that's why we need waiting until previous file will be uploaded, reload page and delete uploaded file
    waitLoading();
    cy.wait(15000);
    cy.allure().startStep('Delete files before upload file');
    cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(
      (isDeleteFilesButtonExists) => {
        if (isDeleteFilesButtonExists) {
          cy.do(Button('Delete files').click());
          cy.expect(Button('or choose files').exists());
          cy.allure().endStep();
        }
      },
    );
  },

  clickResumeButton: () => {
    cy.expect(sectionPaneJobsTitle.find(Button('Resume')).exists());
    cy.do(sectionPaneJobsTitle.find(Button('Resume')).click());
  },

  clickDeleteFilesButton: () => {
    cy.do(sectionPaneJobsTitle.find(Button('Delete files')).click());
  },

  deleteImportJob: (fileName) => {
    cy.get('div[class^="listContainer-"]')
      .contains('li[class^="job-"]', fileName)
      .then((elem) => {
        const trashButton = elem.parent()[0].querySelector('button[icon="trash"]');
        cy.wrap(trashButton).click();
        cy.wrap(trashButton).should('not.be.visible');
      });
  },

  verifyTrashIconInvisibleForUser: () => {
    cy.get('div[class^="listContainer-"] button[icon="trash').should('have.length', 0);
  },

  verifyCancelImportJobModal: () => {
    DataImportAPI.getSplitStatus().then(({ body: { splitStatus } }) => {
      if (splitStatus === false) {
        const headerModalContent = 'Are you sure that you want to cancel this import job?';
        const modalContent =
          'Note: Cancelled jobs cannot be restarted. Records created or updated before\nthe job is cancelled cannot yet be reverted.';
        cy.expect([
          cancelImportJobModal.exists(),
          cancelImportJobModal.find(HTML(including(headerModalContent))).exists(),
          cancelImportJobModal.find(HTML(including(modalContent))).exists(),
          cancelImportJobModal.find(cancelButton, { disabled: true }).exists(),
          cancelImportJobModal.find(yesButton, { disabled: false }).exists(),
        ]);
      } else {
        const headerModalContent =
          'Are you sure that you want to cancel this multipart import job?';

        cy.expect([
          cancelMultipleImportJobModal.exists(),
          cancelMultipleImportJobModal.find(HTML(including(headerModalContent))).exists(),
          cancelMultipleImportJobModal.find(HTML(including('Please note:'))).exists(),
          cancelMultipleImportJobModal
            .find(HTML(including('Cancelled jobs cannot be restarted.')))
            .exists(),
          cancelMultipleImportJobModal
            .find(
              HTML(
                including(
                  'Records created or updated before the job is cancelled cannot be reverted',
                ),
              ),
            )
            .exists(),
          cancelMultipleImportJobModal
            .find(HTML(including(' job parts have already been processed and will ')))
            .exists(),
          cancelMultipleImportJobModal
            .find(
              HTML(
                including(
                  ' remaining job parts including any that are currently in progress and all that have not yet started ',
                ),
              ),
            )
            .exists(),
          cancelMultipleImportJobModal.find(cancelButton, { disabled: true }).exists(),
          cancelMultipleImportJobModal.find(yesButton, { disabled: false }).exists(),
        ]);
      }
    });
  },

  confirmDeleteImportJob: () => {
    DataImportAPI.getSplitStatus().then(({ body: { splitStatus } }) => {
      if (splitStatus === false) {
        cy.do(cancelImportJobModal.find(yesButton).click());
      } else {
        cy.do(cancelMultipleImportJobModal.find(yesButton).click());
      }
    });
  },

  cancelDeleteImportJob: () => {
    DataImportAPI.getSplitStatus().then(({ body: { splitStatus } }) => {
      if (splitStatus === false) {
        cy.do(cancelImportJobModal.find(cancelButton).click());
        cy.expect(cancelImportJobModal.absent());
      } else {
        cy.do(cancelMultipleImportJobModal.find(cancelButton).click());
        cy.expect(cancelMultipleImportJobModal.absent());
      }
    });
  },

  waitFileIsUploaded: () => {
    // TODO need to wait until big file is uploaded
    cy.wait(40000);
  },

  uploadFileAndRetry(filePathName, fileName, maxRetries = 10) {
    let retryCount = 0;
    function upload() {
      waitLoading();
      cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(
        (isDeleteFilesButtonExists) => {
          if (isDeleteFilesButtonExists && retryCount < maxRetries) {
            cy.reload();
            cy.wait(4000);
            retryCount++;
            upload();
          } else {
            uploadFile(filePathName, fileName);
          }
        },
      );
    }
    upload();
  },

  uploadBunchOfFilesWithDifferentFileExtensions(
    firstFileName,
    secondFileName,
    firstFinalFileName,
    secondFinalFileName,
  ) {
    const arrayOfFiles = [];

    FileManager.readFile(`cypress/fixtures/${firstFileName}`).then((actualContent) => {
      const fileName = `${firstFinalFileName}.mrc`;

      FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
      arrayOfFiles.push(fileName);
    });
    FileManager.readFile(`cypress/fixtures/${secondFileName}`).then((actualContent) => {
      const fileName = `${secondFinalFileName}.txt`;

      FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
      arrayOfFiles.push(fileName);
    });

    cy.get('input[type=file]').attachFile(arrayOfFiles);
  },

  verifyDataImportProfiles(profiles) {
    cy.expect(dataImportNavSection.find(NavListItem(profiles)).exists());
  },

  selectDataImportProfile(profile) {
    cy.do(dataImportNavSection.find(NavListItem(profile)).click());
  },

  cancelBlockedImportModal() {
    cy.do(importBlockedModal.find(Button('Cancel')).click());
  },

  verifyImportBlockedModal() {
    cy.expect([
      importBlockedModal.exists(),
      importBlockedModal
        .find(HTML(including('You cannot upload files with this file extension')))
        .exists(),
      importBlockedModal.find(Button('Cancel')).exists(),
      importBlockedModal.find(Button('Choose other files to upload')).exists(),
    ]);
  },

  verifyFileIsImported(fileName) {
    cy.expect(
      Pane({ id: 'pane-upload' })
        .find(HTML(including(fileName)))
        .exists(),
    );
    cy.get('#job-profiles-list').should('exist');
  },
  verifyInconsistentFileExtensionsModal() {
    cy.expect([
      inconsistentFileExtensionsModal.exists(),
      inconsistentFileExtensionsModal
        .find(
          HTML(
            including(
              'You cannot upload files with different extensions. Please upload files with the same extension',
            ),
          ),
        )
        .exists(),
      inconsistentFileExtensionsModal.find(Button('Cancel')).exists(),
      inconsistentFileExtensionsModal.find(Button('Choose other files to upload')).exists(),
    ]);
  },
  verifyUploadSectionHasNoUplodedFiles() {
    cy.expect(sectionPaneJobsTitle.find(Button('or choose files')).exists());
  },

  waitLoadingNoInteractors() {
    cy.expect(sectionPaneJobsTitle.exists());
    cy.expect(logsPaneHeader.exists());
  },

  checkJobSummaryTableExists() {
    cy.xpath("//div[@id= 'job-summary-table']").should('be.visible');
  },
};
