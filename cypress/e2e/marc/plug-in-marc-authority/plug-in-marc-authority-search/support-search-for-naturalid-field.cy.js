import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

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
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 1,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuthC359142.mrc',
      fileName: `testMarcFileAuthC380587_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 3,
      propertyName: 'authority',
    },
  ],
};
describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      before('Creating test data', () => {
        cy.getAdminToken();
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
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
          });
        });
        cy.getAdminToken()
          .then(() => {
            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  if (
                    marcFile.jobProfileToRun === DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS
                  ) {
                    testData.instanceIDs.push(record[marcFile.propertyName].id);
                  } else {
                    testData.authorityIDs.push(record[marcFile.propertyName].id);
                  }
                });
              });
            });
          })
          .then(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
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
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C359142 MARC Authority plug-in | Support search for "naturalId" field using "Keyword" search option (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C359142'] },
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
            MarcAuthorities.checkResultsExistance(testData.authorizedTypes.AUTHORIZED);
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.actionsSelectCheckbox('No');
            });
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.checkAfterSearch(
              testData.authorizedTypes.AUTHORIZED,
              testData.searchResultsOneResult[index],
            );
            MarcAuthorities.clickResetAndCheck();
          });
        },
      );
    });
  });
});
