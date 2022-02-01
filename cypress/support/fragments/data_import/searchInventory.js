import {
  Button,
  KeyValue,
  MultiColumnListCell,
  TextField
} from '../../../../interactors';
import DataImportViewAllPage from './dataImportViewAllPage';
import DateTools from '../../utils/dateTools';
import InventoryInstances from '../inventory/inventoryInstances';


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

const searchInstanceByHRID = (id) => {
  cy.get('#input-inventory-search-qindex').select('Instance HRID');
  cy.do([
    // Select({ id: 'input-inventory-search-qindex' }).choose('Instance HRID'),
    TextField({ id: 'input-inventory-search' }).fillIn(id),
    Button('Search').click()
  ]);
  InventoryInstances.waitLoading();
};

// when creating mapping profile we choose status cataloged date as today
// in inventory, it will be in YYYY-MM-DD format
const expectedCatalogedDate = DateTools.getFormattedDate({ date: new Date() });
// when creating mapping profile we choose instance status term as "Batch Loaded"
// in inventory, this will be "batch" for status code and "Batch Loaded" for status term
const expectedStatusTerm = 'Batch Loaded';
const expectedStatusCode = 'batch';

const checkInstanceDetails = () => {
  cy.do(MultiColumnListCell({ row: 0, columnIndex: 1 }).click());
  const catalogedDate = KeyValue('Cataloged date');
  const instanceStatusTerm = KeyValue('Instance status term');
  const instanceStatusCode = KeyValue('Instance status code');

  cy.expect(catalogedDate.has({ value: expectedCatalogedDate }));
  cy.expect(instanceStatusTerm.has({ value: expectedStatusTerm }));
  cy.expect(instanceStatusCode.has({ value: expectedStatusCode }));
};

export default {
  // TODO: move to existing InventorySearch fragment
  getInstanceHRID,
  // TODO: move to existing InventorySearch fragment
  searchInstanceByHRID,
  // TODO: move to existing  inventory fragment
  checkInstanceDetails,
};
