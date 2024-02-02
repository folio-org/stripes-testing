import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('plug-in MARC authority', () => {
  const testData = {
    tags: {
      tag240: '240',
    },
    instanceTitle: 'A pilgrimes solace / John Dowland.',
    authTitle: 'C385656 Jackson, Peter',
    instanceIDs: [],
    authorityIDs: [],
    searchOptions: {
      personalName: {
        title: 'Personal name',
        value: 'personalNameTitle',
      },
      nameTitle: {
        title: 'Name-title',
        value: 'nameTitle',
      },
      keyword: {
        value: 'keyword',
      },
    },
    marcFiles: [
      {
        marc: 'marcBib385656.mrc',
        fileName: `testMarcFileBib385656.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numberOfRecords: 1,
      },
      {
        marc: 'marcAuth385656.mrc',
        fileName: `testMarcFileAuth385656.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
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
      MarcAuthorities.getMarcAuthoritiesViaApi({
        limit: 100,
        query: `keyword="${testData.authTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
      }).then((authorities) => {
        if (authorities) {
          authorities.forEach(({ id }) => {
            MarcAuthority.deleteViaAPI(id);
          });
        }
      });
    });
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
      .then(() => {
        testData.marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
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
      });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    testData.instanceIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
    testData.authorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C385656 Switching between "Browse" and "Search" views when linking "MARC bib" field (updating query, resetting values) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag240);
      MarcAuthorities.switchToSearch();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.searchOptions.nameTitle.value,
        '',
        'Search',
      );

      MarcAuthorities.searchByParameter(
        testData.searchOptions.personalName.title,
        testData.authTitle,
      );
      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.checkSearchInput(testData.authTitle);
      MarcAuthorities.checkSearchOption(testData.searchOptions.personalName.value);
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);

      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.verifyBrowseAuthorityPane(
        testData.searchOptions.nameTitle.title,
        'Fail PASS (editable) test',
      );

      MarcAuthorities.clickReset();
      MarcAuthorities.checkDefaultBrowseOptions();
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifySearchResultTabletIsAbsent();

      MarcAuthorities.switchToSearch();
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.searchOptions.personalName.value,
        testData.authTitle,
        'Search',
      );

      MarcAuthorities.clickReset();
      MarcAuthorities.checkSearchOption(testData.searchOptions.keyword.value);
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifySearchResultTabletIsAbsent();

      MarcAuthorities.switchToBrowse();
      MarcAuthorities.checkDefaultBrowseOptions();
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifySearchResultTabletIsAbsent();

      MarcAuthorities.switchToSearch();
      MarcAuthorities.checkSearchOption(testData.searchOptions.keyword.value);
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifySearchResultTabletIsAbsent();
    },
  );
});
