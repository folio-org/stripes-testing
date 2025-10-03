import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      searchQuery: 'C415263',
      languageAccordionName: 'Language',
      formatAccordionName: 'Format',
      languageOptionName: 'English',
      formatOptionName: 'unmediated -- volume',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileC415263_1.mrc',
        fileName: `testMarcFileC415263.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcBibFileC415263_2.mrc',
        fileName: `testMarcFileC415263.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
    ];

    const createdRecordIDs = [];

    before('Importing data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 1000,
        query: 'title all "C415263*"',
      }).then((instances) => {
        instances.forEach(({ id }) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        })
        .then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('Deleting user, records', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C415263 Counters in expanded facet accordions updated when another facet is applied (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C415263'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.clickAccordionByName(testData.languageAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.languageAccordionName);
        InventorySearchAndFilter.verifyFilterOptionCount(
          testData.languageAccordionName,
          testData.languageOptionName,
          2,
        );
        InventorySearchAndFilter.clickAccordionByName(testData.formatAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.formatAccordionName);
        InventorySearchAndFilter.verifyFilterOptionCount(
          testData.formatAccordionName,
          testData.formatOptionName,
          1,
        );
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          testData.languageAccordionName,
          testData.languageOptionName,
        );
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          testData.formatAccordionName,
          testData.formatOptionName,
        );
        InventorySearchAndFilter.verifyFilterOptionCount(
          testData.languageAccordionName,
          testData.languageOptionName,
          1,
        );
      },
    );
  });
});
