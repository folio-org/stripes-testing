import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  classificationSearchOption: 'Classification, normalized',
  searchQueries: [
    'HD4661 .I5 1951',
    'hd4661 .i5 1951',
    'M1 51A',
    'm1 51a',
    'QS 46 .GA6 E15 2015',
    'qs 46 .ga6 E15 2015',
  ],
  searchResultsLc: [
    'C466151 Search by Classification (case insensitive check) Instance 3 - LC UPPER case',
    'C466151 Search by Classification (case insensitive check) Instance 4 - LC lower case',
  ],
  searchResultsDewey: [
    'C466151 Search by Classification (case insensitive check) Instance 1 - Dewey UPPER case',
    'C466151 Search by Classification (case insensitive check) Instance 2 - Dewey lower case',
  ],
  searchResultsNlm: [
    'C466151 Search by Classification (case insensitive check) Instance 5 - NLM UPPER case',
    'C466151 Search by Classification (case insensitive check) Instance 6 - NLM lower case',
  ],

  marcFile: {
    marc: 'marcBibFileC466151.mrc',
    fileName: `testMarcFileC466151.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 6,
    propertyName: 'instance',
  },
};

const resultsInstancesTable = [
  testData.searchResultsLc,
  testData.searchResultsLc,
  testData.searchResultsDewey,
  testData.searchResultsDewey,
  testData.searchResultsNlm,
  testData.searchResultsNlm,
];

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="C466151 Search by Classification (case insensitive check) Instance"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });

        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C466151 Search by "Classification" field is case-insensitive (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C466151'] },
        () => {
          testData.searchQueries.forEach((query, index) => {
            InventoryInstances.searchInstancesWithOption(
              testData.classificationSearchOption,
              query,
            );
            resultsInstancesTable[index].forEach((title) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(title, true);
            });
            InventoryInstances.resetAllFilters();
          });
        },
      );
    });
  });
});
