import { recurse } from 'cypress-recurse';
import { HTML } from '@interactors/html';
import {
  Modal,
  Button,
  Select,
  Pane,
  MultiColumnListCell,
  PaneHeader,
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import FileManager from '../../utils/fileManager';

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

const downloadExportedMarcFile = (fileName) => {
  const query =
    '(status=(COMPLETED OR COMPLETED_WITH_ERRORS OR FAIL)) sortby completedDate/sort.descending';
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
      const {
        id,
        exportedFiles: [{ fileId }],
      } = jobExecutions[0];
      const downloadUrl = `${Cypress.env(
        'OKAPI_HOST',
      )}/data-export/job-executions/${id}/download/${fileId}`;

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
  cy.expect(PaneHeader({ id: 'paneHeader8' }).find(Button('View all')).exists());
};

export default {
  downloadCSVFile,
  downloadExportedMarcFile,
  waitLandingPageOpened,
  uploadFile: (fileName) => {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultJobProfile: (
    fileName,
    jobType = 'instances',
    selectType = 'Instances',
    fileType = '.csv',
  ) => {
    cy.do([
      MultiColumnListCell({
        content: `Default ${jobType} export job profile`,
        columnIndex: 0,
      }).click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose(selectType),
      Button('Run').click(),
    ]);
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
      .then((name) => {
        return name.body.jobExecutions[0].exportedFiles[0].fileName;
      });
  },

  verifyFileIncludes(fileName, content) {
    // Wait until file has been downloaded
    recurse(
      () => FileManager.findDownloadedFilesByMask(fileName),
      (x) => typeof x === 'object' && !!x,
    ).then((foundFiles) => {
      const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

      FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
        content.forEach((element) => {
          expect(actualContent).to.include(element);
        });
      });
    });
  },

  waitLoading() {
    cy.expect(Pane('Jobs').exists());
  },

  verifyWarningWithInvalidFileExtension() {
    cy.expect(Modal().find(HTML('Only file with .csv or .cql extension can be uploaded')).exists());
  },

  clickCancelButton() {
    cy.do(Button('Cancel').click());
  },
};
