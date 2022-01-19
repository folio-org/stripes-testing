import { recurse } from 'cypress-recurse';
import FileManager from '../../utils/fileManager';

const downloadCSVFile = (fileName, mask) => {
  recurse(
    () => FileManager.findDownloadedFilesByMask(mask),
    (x) => typeof (x) === 'object' && !!x,
  )
    .then(foundFiles => {
      cy.log(`found file ${foundFiles}`);
      const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

      FileManager
        .readFile(lastDownloadedFilename)
        .then((actualContent) => {
          FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
        });
    });
};

const downloadExportedMarcFile = (fileName) => {
  const query = '(status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL)) sortby completedDate/sort.descending';
  const limit = '1';
  const queryString = new URLSearchParams({ limit, query });

  cy.request({
    method: 'GET',
    url: `${Cypress.env('OKAPI_HOST')}/data-export/job-executions?${queryString}`,
    headers: {
      'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
      'x-okapi-token': Cypress.env('token'),
    },
  })
    .then(({ body: { jobExecutions } }) => {
      const { id, exportedFiles: [{ fileId }] } = jobExecutions[0];
      const downloadUrl = `${Cypress.env('OKAPI_HOST')}/data-export/job-executions/${id}/download/${fileId}`;

      return cy.request({
        method: 'GET',
        url: downloadUrl,
        headers: {
          'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
          'x-okapi-token': Cypress.env('token'),
        },
      });
    })
    .then(({ body:{ link } }) => {
      cy.downloadFile(link, 'cypress/downloads', fileName);
      recurse(
        () => FileManager.findDownloadedFilesByMask(fileName),
        (x) => typeof (x) === 'object' && !!x,
      )
        .then(foundFiles => {
          const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

          FileManager
            .readFile(lastDownloadedFilename)
            .then((actualContent) => {
              FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
            });
        });
    });
};

export default { downloadCSVFile, downloadExportedMarcFile };
