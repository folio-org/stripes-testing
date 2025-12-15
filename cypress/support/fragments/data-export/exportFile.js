import { HTML } from '@interactors/html';
import { recurse } from 'cypress-recurse';
import uuid from 'uuid';
import { Button, Modal, MultiColumnListCell, Pane, Select } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import FileManager from '../../utils/fileManager';

const areYouSureModal = Modal('Are you sure you want to run this job?');
export const defaultJobProfiles = [
  'Default authority export job profile',
  'Default holdings export job profile',
  'Default instances export job profile',
  'Deleted authority export job profile',
];

const downloadCSVFile = (fileName, mask) => {
  // retry until file has been downloaded
  // TODO: add into best practicies in wiki
  recurse(
    () => FileManager.findDownloadedFilesByMask(mask),
    (x) => typeof x === 'object' && !!x,
  ).then((foundFiles) => {
    cy.log(`found file ${foundFiles}`);
    const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

    FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
      // create a new file with the contents of the downloaded file in fixtures
      FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
    });
  });
};

const removeMarcField = ({ inputFileName, outputFileName, fieldTag }) => {
  return FileManager.readFile(`cypress/fixtures/${inputFileName}`).then((marcData) => {
    // Extract the leader (first 24 bytes)
    const leaderLength = 24;
    const leader = marcData.slice(0, leaderLength);
    const FIELD_TERMINATOR = String.fromCharCode(30); // ASCII 30 (field terminator)
    const RECORD_TERMINATOR = String.fromCharCode(29); // ASCII 29 (record terminator)

    // Extract the directory and the record body
    const terminatorIndex = marcData.indexOf(FIELD_TERMINATOR);
    const directory = marcData.slice(leaderLength, terminatorIndex);
    let recordBody = marcData.slice(terminatorIndex + 1, -1);

    // Parse the directory into entries
    const entryLength = 12; // Each directory entry is 12 characters
    const entries = [];
    for (let i = 0; i < directory.length; i += entryLength) {
      const entry = directory.slice(i, i + entryLength);
      entries.push({
        tag: entry.slice(0, 3),
        length: parseInt(entry.slice(3, 7), 10),
        position: parseInt(entry.slice(7, 12), 10),
      });
    }

    // Find the field to remove
    const fieldToRemove = entries.find((entry) => entry.tag === fieldTag);
    if (!fieldToRemove) {
      cy.log(`Field ${fieldTag} not found in the MARC record.`);
      return marcData;
    }

    // Remove the field from the record body
    const start = fieldToRemove.position;
    const end = start + fieldToRemove.length;
    recordBody = recordBody.slice(0, start) + recordBody.slice(end);

    // Update the directory by removing the entry and recalculating positions
    const updatedEntries = entries
      .filter((entry) => entry.tag !== fieldTag)
      .map((entry) => {
        if (entry.position > fieldToRemove.position) {
          entry.position -= fieldToRemove.length;
        }
        return entry;
      });

    // Reconstruct the directory
    const updatedDirectory = updatedEntries
      .map((entry) => {
        const length = String(entry.length).padStart(4, '0');
        const position = String(entry.position).padStart(5, '0');
        return `${entry.tag}${length}${position}`;
      })
      .join('');

    // Reconstruct the MARC record
    const updatedMarcData =
      leader + updatedDirectory + FIELD_TERMINATOR + recordBody + RECORD_TERMINATOR;

    return FileManager.createFile(`cypress/fixtures/${outputFileName}`, updatedMarcData);
  });
};

const downloadExportedMarcFile = (fileName) => {
  const query =
    '(status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL)) sortby completedDate/sort.descending';
  const limit = '1';
  const queryString = new URLSearchParams({ limit, query });

  // get file id and job id
  cy.okapiRequest({
    method: 'GET',
    path: `data-export/job-executions?${queryString}`,
    isDefaultSearchParamsRequired: false,
  })
    .then(({ body: { jobExecutions } }) => {
      const {
        id,
        exportedFiles: [{ fileId }],
      } = jobExecutions[0];

      // get the link to download exported file
      return cy.okapiRequest({
        method: 'GET',
        path: `data-export/job-executions/${id}/download/${fileId}`,
        isDefaultSearchParamsRequired: false,
      });
    })
    .then(({ body: { link } }) => {
      // download exported file
      cy.downloadFile(link, 'cypress/downloads', fileName);

      // wait until file has been downloaded
      recurse(
        () => FileManager.findDownloadedFilesByMask(fileName),
        (x) => typeof x === 'object' && !!x,
      ).then((foundFiles) => {
        const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

        FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
          // create a new file with the contents of the downloaded file in fixtures
          FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
        });
      });
    });
};

const downloadExportedMarcFileWithRecordHrid = (hrid, fileName) => {
  const query =
    '(status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL)) sortby completedDate/sort.descending';
  const limit = '100';
  const queryString = new URLSearchParams({ limit, query });

  cy.wait(5000);
  // get file id and job id
  cy.okapiRequest({
    method: 'GET',
    path: `data-export/job-executions?${queryString}`,
    isDefaultSearchParamsRequired: false,
  })
    .then((jobExecutionResponse) => {
      const jobExecutionId = jobExecutionResponse.body.jobExecutions.find(
        (exec) => exec.hrId === hrid,
      ).id;

      const fileId = jobExecutionResponse.body.jobExecutions.find((exec) => exec.hrId === hrid)
        .exportedFiles[0].fileId;

      // get the link to download exported file
      return cy.okapiRequest({
        method: 'GET',
        path: `data-export/job-executions/${jobExecutionId}/download/${fileId}`,
        isDefaultSearchParamsRequired: false,
      });
    })
    .then(({ body: { link } }) => {
      // download exported file
      cy.downloadFile(link, 'cypress/downloads', fileName);

      // wait until file has been downloaded
      recurse(
        () => FileManager.findDownloadedFilesByMask(fileName),
        (x) => typeof x === 'object' && !!x,
      ).then((foundFiles) => {
        const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

        FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
          // create a new file with the contents of the downloaded file in fixtures
          FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
        });
      });
    });
};

const waitLandingPageOpened = () => {
  cy.expect(Pane('Logs').find(Button('View all')).exists());
};

const uploadFile = (fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile(fileName, { allowEmpty: true });
};

export default {
  downloadCSVFile,
  downloadExportedMarcFile,
  downloadExportedMarcFileWithRecordHrid,
  waitLandingPageOpened,
  uploadFile,
  removeMarcField,
  exportWithDefaultJobProfile: (
    fileName,
    jobType = 'Default instances',
    selectType = 'Instances',
    fileType = '.csv',
  ) => {
    const profileName = `${jobType} export job profile`;

    cy.do(
      MultiColumnListCell({
        content: profileName,
        columnIndex: 0,
      }).click(),
    );

    cy.expect(areYouSureModal.exists());

    if (!defaultJobProfiles.includes(profileName)) {
      cy.do(areYouSureModal.find(Select()).choose(selectType));
    }

    cy.expect(areYouSureModal.find(Button('Cancel')).has({ disabled: false }));
    cy.do(Button('Run').click());
    cy.get('#job-logs-list').contains(fileName.replace(fileType, ''));
  },

  exportWithCreatedJobProfile: (fileName, profileName) => {
    // wait for data to be loaded
    cy.intercept({
      method: 'GET',
      url: '/data-export/job-profiles?*',
    }).as('getProfiles');
    cy.wait('@getProfiles');
    cy.do([
      Pane({ id: 'pane-results' })
        .find(MultiColumnListCell({ content: profileName }))
        .click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);
    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },

  getExportedFileNameViaApi: () => {
    return cy
      .okapiRequest({
        path: 'data-export/job-executions',
        isDefaultSearchParamsRequired: false,
        searchParams: {
          query:
            '(status==("COMPLETED" OR "COMPLETED_WITH_ERRORS" OR "FAIL")) sortBy completedDate/sort.descending',
        },
      })
      .then((response) => {
        return response.body.jobExecutions[0].exportedFiles[0].fileName;
      });
  },

  verifyFileIncludes(fileName, content, include = true) {
    // Wait until file has been downloaded
    recurse(
      () => FileManager.findDownloadedFilesByMask(fileName),
      (x) => typeof x === 'object' && !!x,
    ).then((foundFiles) => {
      const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

      FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
        content.forEach((element) => {
          if (include) {
            if (Array.isArray(element)) {
              // Check for nested array
              element.forEach((nestedElement) => {
                expect(actualContent).to.include(nestedElement);
              });
            } else {
              // Check for regular element
              expect(actualContent).to.include(element);
            }
          } else expect(actualContent).to.not.include(element);
        });
      });
    });
  },

  waitLoading() {
    cy.xpath('//div[@id="data-export-module-display"]').should('exist');
  },

  verifyWarningWithInvalidFileExtension() {
    cy.expect(Modal().find(HTML('Only file with .csv or .cql extension can be uploaded')).exists());
  },

  clickCancelButton() {
    cy.do(Button('Cancel').click());
  },

  uploadRecentlyDownloadedFile(downloadedFile) {
    FileManager.findDownloadedFilesByMask('*.*').then((downloadedFilenames) => {
      const firstDownloadedFilename = downloadedFilenames[0];
      FileManager.readFile(firstDownloadedFilename).then((actualContent) => {
        FileManager.createFile(`cypress/fixtures/${downloadedFile}`, actualContent);
      });
    });
    uploadFile(downloadedFile);
  },

  getRecordHridOfExportedFile(fileName) {
    return cy
      .get('#job-logs-list')
      .contains('div[class^="mclCell-"]', fileName.replace('.csv', ''))
      .then((elem) => {
        const hridElement = elem.parent().find('[class*="mclCell-"]:nth-child(10)');
        return +hridElement[0].innerText;
      });
  },

  moveDownloadedFileToFixtures(downloadedFileMask) {
    return FileManager.findDownloadedFilesByMask(downloadedFileMask).then((downloadedFilenames) => {
      const downloadedFile = downloadedFilenames[0];
      const originalFileName = FileManager.getFileNameFromFilePath(downloadedFile);
      return FileManager.readFile(downloadedFile).then((actualContent) => {
        return FileManager.createFile(`cypress/fixtures/${originalFileName}`, actualContent);
      });
    });
  },

  verifyCSVFileRecordsNumber(fileName, recordsNumber) {
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
        const values = actualContent.split('\n');

        expect(values).to.have.length(recordsNumber);
      });
    });
  },

  /**
   * Export file via API by executing the complete export workflow
   * @param {string} fileName - Name of the CSV file to upload (e.g., 'empty.csv')
   * @param {string} idType - Type of IDs to export ('instance', 'holdings', 'authority', etc.)
   * @param {string} jobProfileName - Name of the job profile to use for export
   * @returns {Cypress.Chainable} Chain with job execution details
   */
  exportFileViaApi(
    fileName,
    idType = 'instance',
    jobProfileName = 'Default instances export job profile',
  ) {
    const fileDefinitionId = uuid();
    let jobExecutionId;

    // Step 1: Create file definition
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export/file-definitions',
        body: {
          size: 0,
          fileName,
          uploadFormat: 'csv',
          id: fileDefinitionId,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((fileDefinitionResponse) => {
        jobExecutionId = fileDefinitionResponse.body.jobExecutionId;

        // Step 2: Upload file (read file content and upload as plain text)
        return cy
          .readFile(`cypress/fixtures/${fileName}`)
          .then((fileContent) => {
            return cy.okapiRequest({
              method: 'POST',
              path: `data-export/file-definitions/${fileDefinitionId}/upload`,
              body: fileContent,
              contentTypeHeader: 'application/octet-stream',
              isDefaultSearchParamsRequired: false,
            });
          })
          .then(() => {
            // Step 3: Get job profile by name
            return cy
              .getDataExportJobProfile({
                query: `name=="${jobProfileName}"`,
              })
              .then((jobProfile) => {
                if (!jobProfile) {
                  throw new Error(`Job profile "${jobProfileName}" not found`);
                }

                // Step 4: Trigger export
                return cy
                  .okapiRequest({
                    method: 'POST',
                    path: 'data-export/export',
                    body: {
                      fileDefinitionId,
                      jobProfileId: jobProfile.id,
                      idType,
                    },
                    isDefaultSearchParamsRequired: false,
                  })
                  .then(() => {
                    // Step 5: Wait for job completion by polling for specific jobExecutionId
                    return recurse(
                      () => cy.okapiRequest({
                        path: 'data-export/job-executions?query=status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL) sortBy completedDate/sort.descending&limit=25',
                        isDefaultSearchParamsRequired: false,
                      }),
                      (jobResponse) => {
                        const jobs = jobResponse.body.jobExecutions || [];
                        const matchingJob = jobs.find((job) => job.id === jobExecutionId);
                        return !!matchingJob;
                      },
                      {
                        log: true,
                        timeout: 60000,
                        delay: 2000,
                      },
                    ).then((finalResponse) => {
                      const jobs = finalResponse.body.jobExecutions || [];
                      const completedJob = jobs.find((job) => job.id === jobExecutionId);

                      return completedJob;
                    });
                  });
              });
          });
      });
  },
};
