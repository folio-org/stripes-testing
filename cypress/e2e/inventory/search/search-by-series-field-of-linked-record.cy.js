import { including } from '@interactors/html';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

const testData = {
  user: {},
  instanceIDs: [],
  authorityIDs: [],
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
    'Robinson, Peter, 1950-2022 Inspector Banks series ;',
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
    'Robinson, Peter, 1950-2022 Inspector Banks series ; 24.',
    'Robinson & Associates, Inc.',
    '1938-1988 Jubilee Conference of the Institution of Agricultural Engineers Robinson College, Cambridge)',
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
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 4,
    },
    {
      marc: 'marcAuth100C375258.mrc',
      fileName: `testMarcFileAuth100C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuth110C375258.mrc',
      fileName: `testMarcFileAuth110C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuth111C375258.mrc',
      fileName: `testMarcFileAuth111C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuth130C375258.mrc',
      fileName: `testMarcFileAuth130C375258.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="Sleeping in the ground"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        testData.searchAuthorityQueries.forEach((query) => {
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });
        });
        testData.marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                testData.instanceIDs.push(link.split('/')[5]);
              } else {
                testData.authorityIDs.push(link.split('/')[5]);
              }
            });
          }
          cy.visit(TopMenu.dataImportPath);
        });
      });
      cy.visit(TopMenu.inventoryPath);
      for (let i = 0; i < testData.instanceRecords.length; i++) {
        InventoryInstance.searchByTitle(testData.instanceRecords[i]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[i]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchAuthorityQueries[i]);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[i]);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.verifySeriesStatement(0, including(testData.seriesStatement[i]));
        InventoryInstances.resetAllFilters();
      }
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
      cy.logout();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C375258 Query search | Search by "Series" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
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

        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[1],
        );
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
        InventoryInstances.resetAllFilters();

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
