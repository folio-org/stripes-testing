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
        searchQuery: 'C553014 filter using 2 dates test',
        allDates1Sorted: ['1902', '1903', '1904', '1905', '1906'],
        dateRangeAccordionName: 'Date range',
      };
      const filterData = [
        { range: ['1902', '1906'] },
        {
          range: ['19035', '19056'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['19035', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19055'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '190'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['0', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '9'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190u', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', 'd905'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190\\', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19_5'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190 ', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19 5'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        { range: ['1935', '1934'], fromError: InventorySearchAndFilter.dateOrderErrorText },
      ];
      const marcFile = {
        marc: 'marcBibFileC553014.mrc',
        fileName: `testMarcFileC553027.${randomPostfix()}.mrc`,
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
        'C553027 Validation of "From" / "To" boxes in "Date range" filter (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553027'] },
        () => {
          filterData.forEach((filterDatum) => {
            InventorySearchAndFilter.filterByDateRange(
              ...filterDatum.range,
              filterDatum.fromError,
              filterDatum.toError,
            );
            testData.allDates1Sorted.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(testData.allDates1Sorted.length);
            InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName, false);
          });
          InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName);
          InventorySearchAndFilter.verifyErrorMessageInAccordion(
            InventorySearchAndFilter.dateRangeAccordion,
            InventorySearchAndFilter.dateOrderErrorText,
          );
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyErrorMessageInTextField(
            InventorySearchAndFilter.dateRangeFromField,
            false,
          );
          InventorySearchAndFilter.verifyErrorMessageInTextField(
            InventorySearchAndFilter.dateRangeToField,
            false,
          );
        },
      );
    });
  });
});
