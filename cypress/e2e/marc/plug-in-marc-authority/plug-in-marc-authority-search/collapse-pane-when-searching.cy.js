import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        authoritySource: 'LC Name Authority file (LCNAF)',
        tags: {
          tag100: '100',
          tag700: '700',
        },
        instanceTitle: 'The data C380574',
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
        marcHeadingPrefix: `AT_C380574_MarcAuthority_${getRandomPostfix()}`,
      };
      const authData = {
        prefix: 'n',
        startsWithNumber: `380574${randomNDigitNumber(15)}`,
      };

      before('Creating user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((createdUserProperties) => {
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
          })
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
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startsWithNumber,
                [
                  {
                    tag: testData.tags.tag100,
                    content: `$a ${testData.marcHeadingPrefix}_1`,
                    indicators: ['1', '\\'],
                  },
                ],
              ).then((createdRecordId) => {
                testData.authorityIDs.push(createdRecordId);
              });
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startsWithNumber + 1,
                [
                  {
                    tag: testData.tags.tag100,
                    content: `$a ${testData.marcHeadingPrefix}_2`,
                    indicators: ['1', '\\'],
                  },
                ],
              ).then((createdRecordId) => {
                testData.authorityIDs.push(createdRecordId);
              });
            });
          })
          .then(() => {
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
            MarcAuthoritiesSearch.selectSearchOption(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD);
            MarcAuthoritiesSearch.verifySelectedSearchOption(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD);
          });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
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
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
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
