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
  subjectSearchOption: 'Subject',
  allSearchOption: 'All',
  searchQueries: ['subjectauto caseauto testauto', 'SUBJECTAUTO CASEAUTO TESTAUTO'],
  searchResults: [
    'C466075 Instance 1, Subject lower case',
    'C466075 Instance 2, Subject UPPER case',
  ],

  marcFile: {
    marc: 'marcBibFileC466075.mrc',
    fileName: `testMarcFileC466075.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 2,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="C466075 Instance"',
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
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
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
        'C466075 Search by "Subject" field is case-insensitive (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire'] },
        () => {
          testData.searchQueries.forEach((query) => {
            InventoryInstances.searchInstancesWithOption(testData.subjectSearchOption, query);
            testData.searchResults.forEach((title) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(title, true);
            });
            InventoryInstances.resetAllFilters();
          });

          testData.searchQueries.forEach((query) => {
            InventoryInstances.searchInstancesWithOption(testData.allSearchOption, query);
            testData.searchResults.forEach((title) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(title, true);
            });
            InventoryInstances.resetAllFilters();
          });
        },
      );
    });
  });
});
