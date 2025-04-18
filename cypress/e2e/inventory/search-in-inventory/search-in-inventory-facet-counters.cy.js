import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import marcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
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
      InventoryInstances.deleteInstanceByTitleViaApi('C415263');
      marcAuthorities.deleteMarcAuthorityByTitleViaAPI('C415263');
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
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
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
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          testData.languageAccordionName,
          testData.languageOptionName,
          2,
        );
        InventorySearchAndFilter.clickAccordionByName(testData.formatAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.formatAccordionName);
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          testData.formatAccordionName,
          testData.formatOptionName,
          1,
        );
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.languageAccordionName,
          testData.languageOptionName,
        );
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.formatAccordionName,
          testData.formatOptionName,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          testData.languageAccordionName,
          testData.languageOptionName,
          1,
        );
      },
    );
  });
});
