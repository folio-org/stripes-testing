import TopMenu from '../topMenu';
import {
  Button,
  KeyValue,
  MultiColumnListCell,
  Select,
  TextField
} from '../../../../interactors';
import DataImportViewAllPage from './dataImportViewAllPage';
import DateTools from '../../utils/dateTools';
import FileManager from '../../utils/fileManager';
import getRandomPostfix from '../../utils/stringTools';


const getInstanceHRID = () => {
  return DataImportViewAllPage
    .getSingleJobProfile() // get the first job id from job logs list
    .then(({ id }) => {
      // then, make request with the job id
      // and get the only record id inside the uploaded file
      const queryString = 'limit=100&order=asc';
      return cy.request({
        method: 'GET',
        url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobLogEntries/${id}?${queryString}`,
        headers: {
          'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
          'x-okapi-token': Cypress.env('token'),
        },
      })
        .then(({ body: { entries } }) => {
          // then, make request with the job id and the record id
          // and get Instance HRID
          const recordId = entries[0].sourceRecordId;
          return cy.request({
            method: 'GET',
            url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobLogEntries/${id}/records/${recordId}`,
            headers: {
              'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
              'x-okapi-token': Cypress.env('token'),
            },
          })
            .then(({ body: { relatedInstanceInfo } }) => {
              return relatedInstanceInfo.hridList[0];
            });
        });
    });
};

const gotoInventory = () => {
  cy.visit(TopMenu.inventoryPath);
};

const searchInstanceByHRID = (id) => {
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Instance HRID'),
    TextField({ id: 'input-inventory-search' }).fillIn(id),
    Button('Search').click()
  ]);
};

// when creating mapping profile we choose status cataloged date as today
// in inventory, it will be in YYYY-MM-DD format
const expectedCatalogedDate = DateTools.getFormattedDate({ date: new Date() });
// when creating mapping profile we choose status "cataloged"
// in inventory, this will be "cat"
const expectedStatus = 'cat';
const checkInstanceDetails = () => {
  cy.do(MultiColumnListCell({ row: 0, columnIndex: 1 }).click());
  const catalogedDate = KeyValue('Cataloged date');
  const instanceStatusCode = KeyValue('Instance status code');

  cy.expect(catalogedDate.has({ value: expectedCatalogedDate }));
  cy.expect(instanceStatusCode.has({ value: expectedStatus }));
};

const fileNameForExport = `test${getRandomPostfix()}.csv`;

export default {
  getInstanceHRID,
  gotoInventory,
  searchInstanceByHRID,
  checkInstanceDetails,

  createFileForExport() {
    // Need time for download file TODO: think about how it can be fixed
    cy.wait(Cypress.env('downloadTimeout'));

    FileManager.findDownloadedFilesByMask('SearchInstanceUUIDs*')
      .then((downloadedFilenames) => {
        const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

        FileManager.readFile(lastDownloadedFilename)
          .then((actualContent) => {
            FileManager.createFile(`cypress/fixtures/${fileNameForExport}`, actualContent);
          });
      });
  },
};
