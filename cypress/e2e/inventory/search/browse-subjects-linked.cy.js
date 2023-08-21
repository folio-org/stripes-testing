import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('Inventory: Subject Browse', () => {
  const testData = {
    tag010: '010',
    tag610: '610',
    subjectName: 'C375163 SuperCorp',
  };

  const marcFiles = [
    {
      marc: 'marcBibC375163.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib'
    },
    {
      marc: 'marcAuthC375163.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      naturalId: 'gf201402375163'
    }
  ];

  const createdRecordIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      // marcFiles.forEach(marcFile => {
      //   cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      //     DataImport.uploadFile(marcFile.marc, marcFile.fileName);
      //     JobProfiles.waitLoadingList();
      //     JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
      //     JobProfiles.runImportFile();
      //     JobProfiles.waitFileIsImported(marcFile.fileName);
      //     Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      //     Logs.openFileDetails(marcFile.fileName);
      //     Logs.getCreatedItemsID().then(link => {
      //       createdRecordIDs.push(link.split('/')[5]);
      //     });
      //   });
      // });

      // cy.visit(TopMenu.inventoryPath).then(() => {
      //   InventoryInstances.waitContentLoading();
      //   InventoryInstance.searchByTitle(createdRecordIDs[0]);
      //   InventoryInstances.selectInstance();
      //   InventoryInstance.editMarcBibliographicRecord();
      //   InventoryInstance.verifyAndClickLinkIcon(testData.tag610);
      //   MarcAuthorities.switchToSearch();
      //   InventoryInstance.verifySelectMarcAuthorityModal();
      //   InventoryInstance.searchResults(testData.subjectName);
      //   MarcAuthorities.checkFieldAndContentExistence(testData.tag010, `‡a ${marcFiles[1].naturalId}`);
      //   InventoryInstance.clickLinkButton();
      //   QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag610);
      //   QuickMarcEditor.pressSaveAndClose();
      //   QuickMarcEditor.checkAfterSaveAndClose();
      // });

      cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    // createdRecordIDs.forEach((id, index) => {
    //   if (index) MarcAuthority.deleteViaAPI(id);
    //   else InventoryInstance.deleteInstanceViaApi(id);
    // });
  });

  it('C375163 Browse | Separate entries for "Subjects" from linked and unlinked "6XX" fields of "MARC bib" record (same subject names) (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventorySearchAndFilter.switchToBrowseTab();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    BrowseSubjects.select();
    BrowseSubjects.browse(testData.subjectName);
    BrowseSubjects.checkNoAuthorityIconDisplayedForRow(0, testData.subjectName);
    BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(1, testData.subjectName);
    BrowseSubjects.checkRowValueIsBold(0, testData.subjectName);
    BrowseSubjects.checkRowValueIsBold(1, testData.subjectName);
    


  });
});
