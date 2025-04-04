/* eslint-disable no-unused-vars */
import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DataImport from '../../../support/fragments/data_import/dataImport';
import randomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const testData = {
        searchQuery: 'C553056 Sorting by Date',
        allDates1Sorted: [
          '0000',
          '   1',
          '___2',
          'd #3',
          '!()4',
          'uuu5',
          'abc6',
          '0007',
          'ddd9',
          '0037',
          'dd99',
          '0337',
          ' 677',
          'u678',
          'c679',
          'd999',
          '1   ',
          '1uu1',
          '1ab2',
          '1 77',
          '1u78',
          '1d79',
          '16  ',
          '16u1',
          '16a2',
          '167 ',
          '1678',
          '168u',
          '169b',
          '9999',
        ],
        dateRangeAccordionName: 'Date range',
      };
      const filterData = [
        { range: ['0000', '9999'], dates: testData.allDates1Sorted },
        { range: ['0035', '1078'], dates: testData.allDates1Sorted.slice(9, 21) },
        { range: ['1670', '1678'], dates: testData.allDates1Sorted.slice(25, 27) },
        { range: ['1670', ''], dates: testData.allDates1Sorted.slice(25) },
        { range: ['', '1670'], dates: testData.allDates1Sorted.slice(0, 26) },
      ];
      const marcFile = {
        marc: 'marcBibFileC553056.mrc',
        fileName: `testMarcFileC553056.${randomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const createdInstanceIds = [];

      before('Create test data, login', () => {
        cy.then(() => {
          cy.getAdminToken();
          // delete existing related instances
          InventoryInstances.getInstancesViaApi({
            limit: 200,
            query: `title="${testData.searchQuery}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        }).then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceIds.push(record[marcFile.propertyName].id);
            });
          });

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C553056 Verify that "Date range" filter is working on computed field from "Date 1" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553056'] },
        () => {
          InventoryInstances.searchByTitle(testData.searchQuery);
          testData.allDates1Sorted.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          filterData.forEach((filterDatum) => {
            InventorySearchAndFilter.filterByDateRange(...filterDatum.range);
            filterDatum.dates.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(filterDatum.dates.length);
            InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName, false);
          });
        },
      );
    });
  });
});
