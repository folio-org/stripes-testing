import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('plug-in MARC authority | Search', () => {
    const testData = {
      forC359206: {
        lcControlNumberA: 'n  00000911',
        lcControlNumberB: 'n  79125030',
        searchOption: 'Identifier (all)',
        valueA: 'Erbil, H. Yıldırım',
        valueB: 'Twain, Mark,',
      }
    };
    
    const marcFiles = [
      {
          marc: 'oneMarcBib.mrc', 
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`, 
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      }, 
      {
          marc: 'marcFileForC359206.mrc', 
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
      }
    ]

    let createdAuthorityID = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach(marcFile => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then(link => {
            createdAuthorityID.push(link.split('/')[5]);
          });
        });
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityID[1]);
    MarcAuthority.deleteViaAPI(createdAuthorityID[2]);

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C359015 MARC Authority plug-in | Search for MARC authority records when the user clicks on the "Link" icon (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdAuthorityID[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    InventoryInstance.verifySelectMarcAuthorityModal();
    InventoryInstance.verifySearchAndFilterDisplay();
    InventoryInstance.closeAuthoritySource();
    InventoryInstance.verifySearchOptions();
    InventoryInstance.fillInAndSearchResults('Starr, Lisa');
    InventoryInstance.checkResultsListPaneHeader();
    InventoryInstance.checkSearchResultsTable();
    InventoryInstance.selectRecord();
    InventoryInstance.checkRecordDetailPage('Starr, Lisa');
    InventoryInstance.closeDetailsView();
    InventoryInstance.closeFindAuthorityModal();
  });

  it('C359206 MARC Authority plug-in | Search using "Identifier (all)" option (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdAuthorityID[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    InventoryInstance.closeAuthoritySource();
    InventoryInstance.verifySearchOptions();
    MarcAuthorities.searchBy(testData.forC359206.searchOption, testData.forC359206.lcControlNumberA);
    MarcAuthorities.checkFieldAndContentExistence('010', testData.forC359206.lcControlNumberA);
    InventoryInstance.checkRecordDetailPage(testData.forC359206.valueA);
    MarcAuthorities.searchBy(testData.forC359206.searchOption, testData.forC359206.lcControlNumberB);
    MarcAuthorities.checkFieldAndContentExistence('010', testData.forC359206.lcControlNumberB);
    InventoryInstance.checkRecordDetailPage(testData.forC359206.valueB);
    MarcAuthorities.clickResetAndCheck();
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.searchBy(testData.forC359206.searchOption, testData.forC359206.lcControlNumberB);
    MarcAuthorities.selectFirstRecord();
    InventoryInstance.getId().then(id => { createdAuthorityID.push(id) });
  });
});