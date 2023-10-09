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

describe('Inventory: Contributors Browse', () => {
  const testData = {
    tag010: '010',
    tag700: '700',
    contributorName: 'Lee, Stanley Test C359595',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC359595.mrc',
      fileName: `testMarcFileC359595.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC359595.mrc',
      fileName: `testMarcFileC359595.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      naturalId: 'n8316359595',
    },
  ];

  const createdRecordIDs = [];

  before('Creating data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIconByIndex(26);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.switchToSearch();
        InventoryInstance.searchResults(testData.contributorName);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag010,
          `‡a ${marcFiles[1].naturalId}`,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(26, testData.tag700);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C359595 Verify that contributors with the same "Name" and "Name type" and one has, and one has not "authorityID" will display in different rows in the response (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributorName);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.contributorName);
      BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(testData.contributorName);
      BrowseSubjects.checkRowValueIsBold(5, testData.contributorName);
      BrowseSubjects.checkRowValueIsBold(6, testData.contributorName);
      BrowseSubjects.checkValueAbsentInRow(4, testData.contributorName);
      BrowseSubjects.checkValueAbsentInRow(7, testData.contributorName);
    },
  );
});
