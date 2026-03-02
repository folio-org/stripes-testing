import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const testData = {
  user: {},
  recordIDs: [],
  tags: ['800', '810', '811', '830'],
  searchOptions: {
    QUERY_SEARCH: 'Query search',
  },
  instanceRecords: [
    'Sleeping in the ground (Test record 1 with linked 800 field)',
    'Sleeping in the ground (Test record 2 with linked 810 field)',
    'Sleeping in the ground (Test record 3 with linked 811 field)',
    'Sleeping in the ground (Test record 4 with linked 830 field)',
  ],
  searchAuthorityQueries: [
    'Robinson, Peter, 1950-2022',
    'Robinson & Associates, Inc.',
    '1938-1988 Jubilee Conference of the Institution of Agricultural Engineers (1988 : Robinson College, Cambridge)',
    'Robinson eminent scholar lecture series',
  ],
  searchQueries: [
    'series = "Robinson"',
    'series = "Robinson, Peter," OR series = "Agricultural Engineers Robinson College, Cambridge"',
    'series == "Robinson eminent scholar lecture series"',
  ],
  seriesStatement: [
    'Robinson, Peter, 1950-2022 Inspector Banks series',
    'Robinson & Associates, Inc.',
    '1938-1988 Jubilee Conference of the Institution of Agricultural Engineers (1988 : Robinson College, Cambridge)',
    'Robinson eminent scholar lecture series',
  ],
  searchResults: [
    'Sleeping in the ground (Test record 1 with linked 800 field) : an Inspector Banks novel / Peter Robinson.',
    'Sleeping in the ground (Test record 2 with linked 810 field) : an Inspector Banks novel / Peter Robinson.',
    'Sleeping in the ground (Test record 3 with linked 811 field) : an Inspector Banks novel / Peter Robinson.',
    'Sleeping in the ground (Test record 4 with linked 830 field) : an Inspector Banks novel / Peter Robinson.',
  ],
  marcFiles: [
    {
      marc: 'marcBibC375258.mrc',
      fileName: `testMarcFileC375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 4,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuth100C375258.mrc',
      fileName: `testMarcFileAuth100C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
    {
      marc: 'marcAuth110C375258.mrc',
      fileName: `testMarcFileAuth110C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
    {
      marc: 'marcAuth111C375258.mrc',
      fileName: `testMarcFileAuth111C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
    {
      marc: 'marcAuth130C375258.mrc',
      fileName: `testMarcFileAuth130C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.then(() => {
        cy.getAdminToken().then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('Sleeping in the ground');
          testData.searchAuthorityQueries.forEach((query) => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
          });
          testData.marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.recordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      })
        .then(() => {
          cy.loginAsAdmin();
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          for (let i = 0; i < testData.instanceRecords.length; i++) {
            cy.ifConsortia(true, () => {
              InventorySearchAndFilter.byShared('No');
            });
            InventoryInstances.searchByTitle(testData.recordIDs[i]);
            InventoryInstance.verifyInstanceTitle(testData.instanceRecords[i]);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tags[i]);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.searchAuthorityQueries[i]);
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.actionsSelectCheckbox('No');
            });
            MarcAuthoritiesSearch.selectExcludeReferencesFilter();
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[i]);
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.verifySeriesStatement(0, including(testData.seriesStatement[i]));
            InventoryInstances.resetAllFilters();
          }
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      for (let i = 0; i < 4; i++) {
        InventoryInstance.deleteInstanceViaApi(testData.recordIDs[i]);
      }
      for (let i = 4; i < 8; i++) {
        MarcAuthority.deleteViaAPI(testData.recordIDs[i], true);
      }
    });

    it(
      'C375258 Query search | Search by "Series" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C375258'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[0],
        );
        InventorySearchAndFilter.checkRowsCount(4);
        testData.searchResults.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
        InventoryInstances.resetAllFilters();

        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[1],
        );
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
        InventoryInstances.resetAllFilters();

        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[2],
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[3], true);
      },
    );
  });
});
