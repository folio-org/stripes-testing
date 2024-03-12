import { HTML, including } from '@interactors/html';
import { recurse } from 'cypress-recurse';
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
import { ACCEPTED_DATA_TYPE_NAMES, JOB_STATUS_NAMES } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import FileManager from '../../utils/fileManager';
import getRandomPostfix from '../../utils/stringTools';
import InventorySearchAndFilter from '../inventory/inventorySearchAndFilter';
import MarcAuthorities from '../marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../marcAuthority/marcAuthority';
import SettingsJobProfile from '../settings/dataImport/jobProfiles/jobProfiles';
import TopMenu from '../topMenu';
import JobProfiles from './job_profiles/jobProfiles';
import Logs from './logs/logs';

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
const orChooseFilesButton = Button('or choose files');
const cancelImportJobModal = Modal('Cancel import job?');
const yesButton = Button('Yes, cancel import job');
const cancelButton = Button('No, do not cancel import');
const dataImportNavSection = Pane({ id: 'app-settings-nav-pane' });
const importBlockedModal = Modal('Import blocked');
const inconsistentFileExtensionsModal = Modal('Inconsistent file extensions');

const uploadFile = (filePathName, fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
};

const uploadBunchOfDifferentFiles = (fileNames) => {
  const arrayOfFiles = [];
  for (let i = 0; i < fileNames.length; i++) {
    arrayOfFiles.push(fileNames[i]);
  }
  cy.get('input[type=file]').attachFile(arrayOfFiles);
  cy.get('#pane-upload', getLongDelay()).find('div[class^="progressInfo-"]').should('not.exist');
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

function uploadDefinitions(keyValue, fileName) {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    body: {
      fileDefinitions: [
        {
          uiKey: keyValue,
          size: 2,
          name: fileName,
        },
      ],
    },
    method: 'POST',
    isDefaultSearchParamsRequired: false,
  });
}

function uploadBinaryMarcFile(fileName, uploadDefinitionId, fileId) {
  // convert file content in binary format (it's correct format for import)
  cy.fixture(fileName, 'binary')
    .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
    .then((blob) => {
      cy.wait(1500);
      cy.okapiRequest({
        path: `data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}`,
        method: 'POST',
        body: blob,
        isDefaultSearchParamsRequired: false,
        contentTypeHeader: 'application/octet-stream',
      });
    });
}

function uploadDefinitionWithId(uploadDefinitionId) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function processFile(
  uploadDefinitionId,
  fileId,
  sourcePath,
  jobExecutionId,
  uiKeyValue,
  jobProfileId,
  metaJobExecutionId,
  date,
) {
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
            uiKey: uiKeyValue,
          },
        ],
      },
      jobProfileInfo: {
        id: jobProfileId,
        name: 'Default - Create instance and SRS MARC Bib',
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
    },
    isDefaultSearchParamsRequired: false,
  });
}

function processFileWithSplitFiles(
  uploadDefinitionId,
  uploadDefinition,
  jobProfileId,
  jobProfileName,
) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/processFiles?defaultMapping=false`,
    method: 'POST',
    body: {
      uploadDefinition,
      jobProfileInfo: {
        id: jobProfileId,
        name: jobProfileName,
        dataType: 'MARC',
      },
    },
    isDefaultSearchParamsRequired: false,
  });
}

function getCreatedRecordInfo(jobExecutionId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
    searchParams: { limit: 100 },
    isDefaultSearchParamsRequired: false,
  });
}

function getCreatedRecordInfoWithSplitFiles(jobExecutionId, recordId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}/records/${recordId}`,
    searchParams: { limit: 100 },
    isDefaultSearchParamsRequired: false,
  });
}

function getJodStatus(jobExecutionId) {
  return cy.okapiRequest({
    path: `change-manager/jobExecutions/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function checkSplitStatus() {
  return cy.okapiRequest({
    path: 'data-import/splitStatus',
    isDefaultSearchParamsRequired: false,
  });
}

function getUploadUrl(fileName) {
  return cy.okapiRequest({
    path: `data-import/uploadUrl?filename=${fileName}`,
    contentTypeHeader: 'application/octet-stream',
    isDefaultSearchParamsRequired: false,
  });
}

function getTag(uploadUrl, file) {
  return cy.request({
    method: 'PUT',
    url: uploadUrl,
    body: file,
    headers: {
      'x-okapi-token': Cypress.env('token'),
      'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
    },
  });
}

function uploadDefinitionWithAssembleStorageFile(
  uploadDefinitionId,
  fileId,
  s3UploadId,
  s3UploadKey,
  s3Etag,
  blob,
) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}/assembleStorageFile`,
    body: {
      uploadId: s3UploadId,
      key: s3UploadKey,
      tags: [s3Etag],
      blob,
    },
    method: 'POST',
    isDefaultSearchParamsRequired: false,
  });
}

function getParentJobExecutionId() {
  // splitting process creates additional job executions for parent/child
  // so we need to query to get the correct job execution ID COMPOSITE_PARENT
  return cy.okapiRequest({
    path: 'metadata-provider/jobExecutions?limit=10000&sortBy=started_date,desc&subordinationTypeNotAny=COMPOSITE_CHILD&subordinationTypeNotAny=PARENT_SINGLE',
    isDefaultSearchParamsRequired: false,
  });
}

function getChildJobExecutionId(jobExecutionId) {
  return cy.okapiRequest({
    path: `change-manager/jobExecutions/${jobExecutionId}/children`,
    isDefaultSearchParamsRequired: false,
  });
}

function getRecordSourceId(jobExecutionId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
    searchParams: { limit: 100, query: 'order=asc' },
  });
}

function uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName) {
  const uiKeyValue = fileName;

  return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    const fileId = response.body.fileDefinitions[0].id;
    const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;

    uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
    // need to wait until file will be converted and uploaded
    cy.wait(1500);
    uploadDefinitionWithId(uploadDefinitionId).then((res) => {
      const sourcePath = res.body.fileDefinitions[0].sourcePath;
      const metaJobExecutionId = res.body.metaJobExecutionId;
      const date = res.body.createDate;

      SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
        ({ jobProfiles }) => {
          processFile(
            uploadDefinitionId,
            fileId,
            sourcePath,
            jobExecutionId,
            uiKeyValue,
            jobProfiles[0].id,
            metaJobExecutionId,
            date,
          );
        },
      );

      recurse(
        () => getJodStatus(jobExecutionId),
        (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
        {
          limit: 16,
          timeout: 80000,
          delay: 5000,
        },
      );

      getCreatedRecordInfo(jobExecutionId).then((recordResponse) => {
        // we can get relatedInstanceInfo and in it get idList or hridList
        const recordInfo = recordResponse.body.entries.map((entry) => ({
          instance: {
            id: entry.relatedInstanceInfo.length === 0 ? '' : entry.relatedInstanceInfo.idList[0],
            hrid:
              entry.relatedInstanceInfo.length === 0 ? '' : entry.relatedInstanceInfo.hridList[0],
          },
          holding: {
            id: entry.relatedHoldingsInfo.length === 0 ? '' : entry.relatedHoldingsInfo.idList[0],
            hrid:
              entry.relatedHoldingsInfo.length === 0 ? '' : entry.relatedHoldingsInfo.hridList[0],
          },
          item: {
            id: entry.relatedItemInfo.length === 0 ? '' : entry.relatedItemInfo.idList[0],
            hrid: entry.relatedItemInfo.length === 0 ? '' : entry.relatedItemInfo.hridList[0],
          },
          authorityInfo: {
            id: entry.relatedAuthorityInfo.length === 0 ? '' : entry.relatedAuthorityInfo.idList[0],
            hrid:
              entry.relatedAuthorityInfo.length === 0 ? '' : entry.relatedAuthorityInfo.hridList[0],
          },
        }));
        return recordInfo;
      });
    });
  });
}

function uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName) {
  const uiKeyValue = fileName;

  return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    const fileId = response.body.fileDefinitions[0].id;

    getUploadUrl(fileName).then((urlResponse) => {
      const s3UploadKey = urlResponse.body.key;
      const s3UploadId = urlResponse.body.uploadId;
      const uploadUrl = urlResponse.body.url;

      cy.fixture(filePathName).then((file) => {
        cy.wait(1500);
        getTag(uploadUrl, file).then((tagResponse) => {
          const s3Etag = tagResponse.headers.etag;

          uploadDefinitionWithAssembleStorageFile(
            uploadDefinitionId,
            fileId,
            s3UploadId,
            s3UploadKey,
            s3Etag,
          ).then(() => {
            uploadDefinitionWithId(uploadDefinitionId).then((uploadDefinitionResponse) => {
              const uploadDefinition = uploadDefinitionResponse.body;
              const sourcePath = uploadDefinitionResponse.body.fileDefinitions[0].sourcePath;

              SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
                ({ jobProfiles }) => {
                  processFileWithSplitFiles(
                    uploadDefinitionId,
                    uploadDefinition,
                    jobProfiles[0].id,
                    jobProfiles[0].name,
                  );
                },
              );

              getParentJobExecutionId().then((jobExecutionResponse) => {
                const parentJobExecutionId = jobExecutionResponse.body.jobExecutions.find(
                  (exec) => exec.sourcePath === sourcePath,
                ).id;
                recurse(
                  () => getJodStatus(parentJobExecutionId),
                  (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
                  {
                    limit: 16,
                    timeout: 80000,
                    delay: 5000,
                  },
                );

                getChildJobExecutionId(parentJobExecutionId).then((resp2) => {
                  const childJobExecutionId = resp2.body.jobExecutions[0].id;

                  return getRecordSourceId(childJobExecutionId).then((resp3) => {
                    const sourceRecords = resp3.body.entries;
                    const infos = [];

                    // Use Promise.all to wait for all asynchronous operations to complete
                    return Promise.all(
                      sourceRecords.map((record) => {
                        return getCreatedRecordInfoWithSplitFiles(
                          childJobExecutionId,
                          record.sourceRecordId,
                        ).then((recordResponse) => {
                          const recordInfo = {
                            instance: {
                              id:
                                recordResponse.body.relatedInstanceInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedInstanceInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedInstanceInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedInstanceInfo.hridList[0],
                            },
                            holding: {
                              id:
                                recordResponse.body.relatedHoldingsInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedHoldingsInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedHoldingsInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedHoldingsInfo.hridList[0],
                            },
                            item: {
                              id:
                                recordResponse.body.relatedItemInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedItemInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedItemInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedItemInfo.hridList[0],
                            },
                            authorityInfo: {
                              id:
                                recordResponse.body.relatedAuthorityInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedAuthorityInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedAuthorityInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedAuthorityInfo.hridList[0],
                            },
                          };
                          infos.push(recordInfo);
                        });
                      }),
                    ).then(() => {
                      // Return infos array after all asynchronous operations are completed
                      return infos;
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

export default {
  importFile,
  uploadFile,
  uploadBunchOfFiles,
  waitLoading,
  uploadBunchOfDifferentFiles,
  uploadFileWithoutSplitFilesViaApi,
  uploadFileWithSplitFilesViaApi,

  // actions
  importFileForBrowse(profileName, fileName) {
    JobProfiles.waitLoadingList();
    JobProfiles.search(profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    Logs.openFileDetails(fileName);
  },

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
    cy.get('#pane-upload', getLongDelay()).find('div[class^="progressInfo-"]').should('not.exist');
  },

  uploadMarcBib: () => {
    // unique file name to upload
    const nameForMarcFileWithBib = `autotest1Bib${getRandomPostfix()}.mrc`;
    // upload a marc file for export
    cy.visit(TopMenu.dataImportPath);
    uploadFile('oneMarcBib.mrc', nameForMarcFileWithBib);
    JobProfiles.search(JobProfiles.defaultInstanceAndSRSMarcBib);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameForMarcFileWithBib);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID().then((id) => {
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

  checkMultiColumnListRowsCount: (count) => cy.expect(jobLogsList.has({ rowCount: count })),

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

  uploadFileViaApi1: (filePathName, fileName, profileName) => {
    return checkSplitStatus().then((resp) => {
      if (resp.body.splitStatus === false) {
        uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName);
      } else {
        uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName);
      }
    });
  },

  // TODO delete after moving all tests to uploadFileViaApi1 function
  uploadFileViaApi: (filePathName, fileName, profileName) => {
    const uiKeyValue = fileName;

    return uploadDefinitions(uiKeyValue, fileName).then((response) => {
      const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
      const fileId = response.body.fileDefinitions[0].id;
      const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;

      uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
      // need to wait until file will be converted and uploaded
      cy.wait(1500);
      uploadDefinitionWithId(uploadDefinitionId).then((res) => {
        const sourcePath = res.body.fileDefinitions[0].sourcePath;
        const metaJobExecutionId = res.body.metaJobExecutionId;
        const date = res.body.createDate;

        SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
          ({ jobProfiles }) => {
            processFile(
              uploadDefinitionId,
              fileId,
              sourcePath,
              jobExecutionId,
              uiKeyValue,
              jobProfiles[0].id,
              metaJobExecutionId,
              date,
            );
          },
        );

        recurse(
          () => getJodStatus(jobExecutionId),
          (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
          {
            limit: 16,
            timeout: 80000,
            delay: 5000,
          },
        );

        getCreatedRecordInfo(jobExecutionId).then((resp) => {
          // we can get relatedInstanceInfo and in it get idList or hridList
          const recordInfo = resp.body;
          return recordInfo;
        });
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
    cy.do(actionsButton.click());
    cy.expect(deleteLogsButton.is({ disabled: true }));
  },

  verifyUploadState: (maxRetries = 10) => {
    // multiple users to be running Data Import in the same Tenant at the same time
    // because this is possible by design
    // that's why we need waiting until previous file will be uploaded or reload page
    let retryCount = 0;
    waitLoading();
    cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(
      (isDeleteFilesButtonExists) => {
        if (isDeleteFilesButtonExists && retryCount < maxRetries) {
          cy.reload();
          cy.wait(4000);
          retryCount++;
        }
      },
    );
    cy.expect(sectionPaneJobsTitle.find(Button('or choose files')).exists());
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
  },

  confirmDeleteImportJob: () => {
    cy.do(cancelImportJobModal.find(yesButton).click());
  },

  cancelDeleteImportJob: () => {
    cy.do(cancelImportJobModal.find(cancelButton).click());
    cy.expect(cancelImportJobModal.absent());
  },

  waitFileIsUploaded: () => {
    // TODO need to wait until big file is uploaded
    cy.wait(20000);
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
};
