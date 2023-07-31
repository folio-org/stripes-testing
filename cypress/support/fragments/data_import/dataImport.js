import { HTML, including } from '@interactors/html';
import {
  Button,
  Checkbox,
  Section,
  PaneHeader,
  Pane,
  Modal,
  MultiColumnList,
  MultiColumnListCell
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix from '../../utils/stringTools';
import JobProfiles from './job_profiles/jobProfiles';
import InventorySearchAndFilter from '../inventory/inventorySearchAndFilter';
import TopMenu from '../topMenu';
import MarcAuthority from '../marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../marcAuthority/marcAuthorities';
import FileManager from '../../utils/fileManager';
import Logs from './logs/logs';
import DataImportUploadFile from '../../../../interactors/dataImportUploadFile';
import { ACCEPTED_DATA_TYPE_NAMES, JOB_STATUS_NAMES } from '../../constants';

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
const orChooseFilesButton = Button('or choose files');
const cancelImportJobModal = Modal('Cancel import job?');
const yesButton = Button('Yes, cancel import job');

const uploadFile = (filePathName, fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
};

const uploadBunchOfFiles = (editedFileName, numberOfFiles, finalFileName) => {
  const arrayOfFiles = [];

  for (let i = 0; i < numberOfFiles; i++) {
    FileManager.readFile(`cypress/fixtures/${editedFileName}`)
      .then((actualContent) => {
        const fileName = `${finalFileName + i}.mrc`;

        FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
        arrayOfFiles.push(fileName);
      });
  }
  cy.get('input[type=file]').attachFile(arrayOfFiles);
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

  getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then(link => {
    const jobLogEntriesUid = link.split('/').at(-2);
    const recordId = link.split('/').at(-1);

    cy.intercept({
      method: 'GET',
      url: `/metadata-provider/jobLogEntries/${jobLogEntriesUid}/records/${recordId}`,
    }).as('getRecord');

    cy.visit(link);

    cy.wait('@getRecord', getLongDelay()).then(request => {
      const internalAuthorityId = request.response.body.relatedAuthorityInfo.idList[0];

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
      MarcAuthorities.select(internalAuthorityId);
      MarcAuthority.waitLoading();
    });
  });
};

function uploadDefinitions(keyValue, fileName) {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    body: { fileDefinitions: [{
      uiKey: keyValue,
      size: 2,
      name: fileName
    }] },
    method: 'POST',
    isDefaultSearchParamsRequired: false
  });
}

function uploadBinaryMarcFile(fileName, uploadDefinitionId, fileId) {
  // convert file content in binary format (it's correct format for import)
  cy.fixture(fileName, 'binary')
    .then(binary => Cypress.Blob.binaryStringToBlob(binary))
    .then(blob => {
      cy.wait(1500);
      cy.okapiRequest({
        path: `data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}`,
        method: 'POST',
        body: blob,
        isDefaultSearchParamsRequired: false,
        contentTypeHeader: 'application/octet-stream'
      });
    });
}

function uploadDefinitionWithId(uploadDefinitionId) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}`,
    isDefaultSearchParamsRequired: false
  });
}

function processFile(uploadDefinitionId, fileId, sourcePath, jobExecutionId, uiKeyValue, jobProfileId, metaJobExecutionId, date) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/processFiles`,
    method: 'POST',
    body: {
      uploadDefinition: {
        id: uploadDefinitionId,
        metaJobExecutionId,
        status: 'LOADED',
        createDate: date,
        fileDefinitions: [
          {
            id: fileId,
            sourcePath,
            name: 'oneMarcBib.mrc',
            status: 'UPLOADED',
            jobExecutionId,
            uploadDefinitionId,
            createDate: date,
            uploadedDate: date,
            size: 2,
            uiKey: uiKeyValue
          }
        ]
      },
      jobProfileInfo: {
        id: jobProfileId,
        name: 'Default - Create instance and SRS MARC Bib',
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC
      }
    },
    isDefaultSearchParamsRequired: false
  });
}

export default {
  importFile,
  uploadFile,
  uploadBunchOfFiles,
  waitLoading,
  uploadDefinitions,
  uploadBinaryMarcFile,
  processFile,

  // actions
  importFileForBrowse(profileName, fileName) {
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    Logs.openFileDetails(fileName);
  },

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
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameForMarcFileWithBib);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(id => {
        cy.wrap(id).as('requestedHrId');
      });
    return cy.get('@requestedHrId');
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
    const hrIdColumnIndex = 8;
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

  checkMultiColumnListRowsCount: count => cy.expect(jobLogsList.has({ rowCount: count })),

  checkIsLandingPageOpened: () => {
    cy.expect(jobsPane.find(orChooseFilesButton).exists());
    cy.expect(logsPaneHeader.find(actionsButton).exists());
  },

  editMarcFile(editedFileName, finalFileName, stringToBeReplaced, replaceString) {
    // stringToBeReplaced and replaceString must be array. Array length must be equal
    FileManager.readFile(`cypress/fixtures/${editedFileName}`)
      .then((actualContent) => {
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
    FileManager.readFile(`cypress/fixtures/${editedFileName}`)
      .then((actualContent) => {
        const currentContent = actualContent;

        FileManager.readFile(`cypress/fixtures/${fileWithContentForEdit}`)
          .then((content) => {
            const contentForEdit = content;
            const newContent = currentContent.concat(contentForEdit);

            FileManager.createFile(`cypress/fixtures/${finalFileName}`, newContent);
          });
      });
  },

  uploadFileViaApi:(filePathName, fileName) => {
    const uiKeyValue = fileName;

    uploadDefinitions(uiKeyValue, fileName)
      .then((response) => {
        const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
        const fileId = response.body.fileDefinitions[0].id;
        const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;
        const jobProfileId = 'e34d7b92-9b83-11eb-a8b3-0242ac130003';

        uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
        // need to wait until file will be converted and uploaded
        cy.wait(1500);
        uploadDefinitionWithId(uploadDefinitionId)
          .then(res => {
            const sourcePath = res.body.fileDefinitions[0].sourcePath;
            const metaJobExecutionId = res.body.metaJobExecutionId;
            const date = res.body.createDate;

            processFile(uploadDefinitionId, fileId, sourcePath, jobExecutionId, uiKeyValue, jobProfileId, metaJobExecutionId, date);
          });
      });
  },

  clickDataImportNavButton:() => {
    // TODO delete this function after fix https://issues.folio.org/browse/MODDATAIMP-691
    cy.do(Button({ id:'app-list-item-clickable-data-import-module' }).click());
  },

  // checks
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

  verifyLogsPaneSubtitleAbsent: () => cy.expect(logsPane.find(HTML(including('selected'))).absent()),
  verifyChooseFileButtonState: ({ isDisabled }) => cy.expect(orChooseFilesButton.has({ disabled: isDisabled })),

  verifyDeleteLogsButtonDisabled: () => {
    cy.do(actionsButton.click());
    cy.expect(deleteLogsButton.is({ disabled: true }));
  },

  // delete file if it hangs unimported before test
  verifyUploadState: () => {
    cy.allure().startStep('Delete files before upload file');
    waitLoading();
    cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(isDeleteFilesButtonExists => {
      if (isDeleteFilesButtonExists) {
        cy.do(Button('Delete files').click());
        cy.expect(Button('or choose files').exists());
        cy.allure().endStep();
      }
    });
  },

  deleteImportJob:(fileName) => {
    cy.get('div[class^="listContainer-"]').contains('li[class^="job-"]', fileName).then(elem => {
      elem.parent()[0].querySelector('button[icon="trash"]').click();
    });
  },

  verifyCancelImportJobModal:() => {
    cy.expect([
      cancelImportJobModal.exists(),
      cancelImportJobModal.find(yesButton).exists(),
      cancelImportJobModal.find(Button('No, do not cancel import')).exists()
    ]);
  },

  cancelImportJob:() => {
    cy.do(cancelImportJobModal.find(yesButton).click());
  },

  waitFileIsUploaded:() => {
    // TODO need to wait until big file is uploaded
    cy.wait(10000);
  }
};
