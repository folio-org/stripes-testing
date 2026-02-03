import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        authoritySource: 'LC Name Authority file (LCNAF)',
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data C380574',
        authSearchOption: {
          KEYWORD: 'Keyword',
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC380574.mrc',
            fileName: `testMarcFileBibC380574.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
        ],
      };

      before('Creating user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
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
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C380574 MARC Authority plug-in | Collapse and expand "Search & filter" pane when searching for "MARC Authority" records (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380574'] },
        () => {
          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);
          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded(true);
          MarcAuthoritiesSearch.fillSearchInput('*');
          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);
          MarcAuthoritiesSearch.clickShowFilters();
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.selectRecordByIndex(0);
          MarcAuthority.waitLoading();
          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthority.verifySearchPanesIsAbsent();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();
          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySource);
          MarcAuthorities.checkSelectedAuthoritySource(testData.authoritySource);
          MarcAuthorities.clickResetAndCheck('*');
        },
      );
    });
  });
});
