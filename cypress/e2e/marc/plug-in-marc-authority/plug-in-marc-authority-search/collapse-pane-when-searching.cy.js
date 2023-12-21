import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

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
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numberOfRecords: 1,
      },
    ],
  };

  before('Creating user', () => {
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
        cy.login(testData.userProperties.username, testData.userProperties.password, {
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

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    testData.instanceIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380574 MARC Authority plug-in | Collapse and expand "Search & filter" pane when searching for "MARC Authority" records (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
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
