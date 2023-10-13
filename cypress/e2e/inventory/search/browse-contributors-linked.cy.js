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
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('Inventory: Contributors Browse', () => {
  const testData = {
    contributorName: 'Lee, Stanley Test C359596',
  };

  const marcFiles = [
    {
      marc: 'marcBibC359596.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthC359596_1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      naturalId: 'n831692600011181',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthC359596_2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      naturalId: 'n831692600011182',
      numOfRecords: 1,
    },
  ];

  const tagInfo = [
    {
      rowIndex: 12,
      authNaturalId: 'n831692600011181',
    },
    {
      rowIndex: 13,
      authNaturalId: 'n831692600011182',
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
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        tagInfo.forEach((tag) => {
          QuickMarcEditor.clickLinkIconInTagField(tag.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResultsWithOption('Identifier (all)', tag.authNaturalId);
          InventoryInstance.clickLinkButton();
          InventoryInstance.closeDetailsView();
          InventoryInstance.closeFindAuthorityModal();
          // wait for a modal to fully close
          cy.wait(1500);
        });
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.waitLoading();
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C359596 Verify that contributors with the same "Name", "Name type" and different "authorityID" will display in different rows in the response (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire], retries: 1 },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributorName);
      BrowseContributors.checkAuthorityIconAndValueDisplayedForMultipleRows(
        2,
        testData.contributorName,
      );
    },
  );
});
