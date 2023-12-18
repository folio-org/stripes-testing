import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import Users from '../../../support/fragments/users/users';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Permissions } from '../../../support/dictionary';
import { REFERENCES_FILTER_CHECKBOXES } from '../../../support/constants';

const testData = {
  user: {},
  instanceIDs: [],
  authorityIDs: [],
  tag: '111',
  marcValue: 'Mediterranean Conference on Medical and Biological Engineering',
  instanceTitle:
    'Mediterranean conference on medical and biological engineering and computing 2013 / Laura M. Roa Romero, editor.',
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
};

const marcFiles = [
  {
    marc: 'marcBibC375263.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  },
  {
    marc: 'marcAuthC375263.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create SRS MARC Authority',
    numOfRecords: 1,
  },
];
describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Creating user', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      }).then(() => {
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
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: `keyword="${testData.marcValue}" and (authRefType==("Authorized" or "Auth/Ref"))`,
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });
        marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);

          for (let i = 0; i < marcFile.numOfRecords; i++) {
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

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.marcValue);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        MarcAuthoritiesSearch.selectExcludeReferencesFilter(
          REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((createdUserProperties) => {
          testData.user = createdUserProperties;
        })
        .then(() => {
          cy.logout();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
    });

    after('Deleting created user', () => {
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
      'C375263 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "111" field (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        // Step 1: Input query in search input field that will return imported "MARC authority" record → Click "Search"
        MarcAuthorities.searchBy('Keyword', testData.marcValue);
        MarcAuthorities.checkAfterSearch(testData.authorizedTypes.AUTHORIZED, testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '1');

        // Step 2: Click a number in "Number of titles" column for "Authorized" row
        MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      },
    );
  });
});
