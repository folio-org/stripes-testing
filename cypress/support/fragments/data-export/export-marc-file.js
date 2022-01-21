import { recurse } from 'cypress-recurse';
import FileManager from '../../utils/fileManager';

const downloadCSVFile = (fileName, mask) => {
  // retry until file has been downloaded
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
          // create a new file with the contents of the downloaded file in fixtures
          FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
        });
    });
};

const downloadExportedMarcFile = (fileName) => {
  const query = '(status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL)) sortby completedDate/sort.descending';
  const limit = '1';
  const queryString = new URLSearchParams({ limit, query });

  // get file id and job id
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

      // get the link to download exported file
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
      // download exported file
      cy.downloadFile(link, 'cypress/downloads', fileName);

      // wait until file has been downloaded
      recurse(
        () => FileManager.findDownloadedFilesByMask(fileName),
        (x) => typeof (x) === 'object' && !!x,
      )
        .then(foundFiles => {
          const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

          FileManager
            .readFile(lastDownloadedFilename)
            .then((actualContent) => {
              // create a new file with the contents of the downloaded file in fixtures
              FileManager.createFile(`cypress/fixtures/${fileName}`, actualContent);
            });
        });
    });
};

export default { downloadCSVFile, downloadExportedMarcFile };
