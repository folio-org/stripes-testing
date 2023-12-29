import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

const testData = {
  instanceIDs: [],
  authorityIDs: [],
  instanceTitle: 'C359142',
  tags: {
    tag700: '700',
  },
  searchOptions: {
    KEYWORD: 'Keyword',
  },
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
  searchQueries: ['n83169267', 'n80036674407668', 'n  83169267'],
  searchQueriesOneResult: ['n20110491614076272', 'n  20110491614076272'],
  searchResults: ['Lee, Stan, 1922-2018', 'Kerouac, Jack, 1922-1969', 'Lee, Stan, 1922-2018'],
  searchResultsOneResult: ['Lentz, Mark', 'Lentz, Mark'],
  marcFiles: [
    {
      marc: 'marcBibC359142.mrc',
      fileName: `testMarcFileBib360551.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC359142.mrc',
      fileName: `testMarcFileAuthC380587_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 3,
    },
  ],
};
describe('MARC', () => {
  describe('plug-in MARC authority | Search', () => {
    before('Creating test data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: `title="${testData.instanceTitle}"`,
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        [...testData.searchQueries, ...testData.searchQueriesOneResult].forEach((query) => {
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
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
        .then(() => {
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
        })
        .then(() => {
          cy.logout();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
        });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C359142 MARC Authority plug-in | Support search for "naturalId" field using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        testData.searchQueries.forEach((query, index) => {
          MarcAuthorities.searchByParameter(testData.searchOptions.KEYWORD, query);
          MarcAuthorities.checkAfterSearch(
            testData.authorizedTypes.AUTHORIZED,
            testData.searchResults[index],
          );
        });

        testData.searchQueriesOneResult.forEach((query, index) => {
          MarcAuthorities.searchByParameter(testData.searchOptions.KEYWORD, query);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.checkAfterSearch(
            testData.authorizedTypes.AUTHORIZED,
            testData.searchResultsOneResult[index],
          );
        });
      },
    );
  });
});
