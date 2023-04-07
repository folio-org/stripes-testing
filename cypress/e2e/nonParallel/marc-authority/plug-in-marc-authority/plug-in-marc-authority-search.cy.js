import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('plug-in MARC authority | Search', () => {
    const testData = {
      forC359206: {
        lcControlNumberA: 'n  00000911',
        lcControlNumberB: 'n  79125030',
        searchOption: 'Identifier (all)',
        valueA: 'Erbil, H. Yıldırım',
        valueB: 'Twain, Mark,',
      },
      forC359228: {
        searchOption: 'Corporate/Conference name',
        type: 'Authorized',
        typeOfHeadingA: 'Corporate Name',
        typeOfHeadingB: 'Conference Name',
        all: '*',
        title: 'Apple Academic Press',
      },
      forC359229: {
        searchOptionA: 'Geographic name',
        searchOptionB: 'Keyword',
        valueA: 'Gulf Stream',
        valueB: 'North',
        type: 'Authorized',
      },
    };
    
    const marcFiles = [
      {
        marc: 'oneMarcBib.mrc', 
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`, 
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      }, 
      {
        marc: 'marcFileForC359015.mrc', 
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      },
      {
        marc: 'marcFileForC359206.mrc', 
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 2,
      },
      {
        marc: 'marcFileForC359228.mrc', 
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 5,
      },
      {
        marc: 'marcFileForC359229.mrc', 
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 2,
      }
    ]

    let createdAuthorityIDs = [];

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
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then(link => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    for (let i = 1; i < 11; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C359015 MARC Authority plug-in | Search for MARC authority records when the user clicks on the "Link" icon (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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
  });

  it('C359228 MARC Authority plug-in | Search using "Corporate/Conference name" option (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    InventoryInstance.verifySearchOptions();
    MarcAuthorities.searchByParameter(testData.forC359228.searchOption, testData.forC359228.all);
    // wait for the results to be loaded.
    cy.wait(1000);
    MarcAuthorities.checkAfterSearchHeadingType(testData.forC359228.type, testData.forC359228.typeOfHeadingA, testData.forC359228.typeOfHeadingB);
    MarcAuthorities.selectTitle(testData.forC359228.title);
    MarcAuthorities.checkRecordDetailPageMarkedValue(testData.forC359228.title);
    MarcAuthorities.chooseTypeOfHeadingAndCheck(testData.forC359228.typeOfHeadingB, testData.forC359228.typeOfHeadingA, testData.forC359228.typeOfHeadingB);
  });

  it('C359229 MARC Authority plug-in | Search using "Geographic name" option (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    InventoryInstance.closeAuthoritySource();
    InventoryInstance.verifySearchOptions();
    MarcAuthorities.searchBy(testData.forC359229.searchOptionA, testData.forC359229.valueA);
    MarcAuthorities.checkFieldAndContentExistence('151', testData.forC359229.valueA);
    InventoryInstance.checkRecordDetailPage(testData.forC359229.valueA);
    MarcAuthorities.searchBy(testData.forC359229.searchOptionB, testData.forC359229.valueB);
    MarcAuthorities.checkResultsExistance(testData.forC359229.type);
  });
});