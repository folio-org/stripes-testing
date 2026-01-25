import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      tag010: '010',
      tag700: '700',
      contributorName: 'Lee, Stanley Test C359595',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileC359595.mrc',
        fileName: `testMarcFileC359595.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC359595.mrc',
        fileName: `testMarcFileC359595.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        naturalId: 'n8316359595',
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Creating data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.contributorName);
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        const uploadPromises = marcFiles.map((marcFile) => DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        }));

        cy.wrap(Promise.all(uploadPromises)).then(() => {
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(26);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(testData.contributorName);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[1].naturalId}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(26, testData.tag700);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C359595 Verify that contributors with the same "Name" and "Name type" and one has, and one has not "authorityID" will display in different rows in the response (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C359595'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        BrowseContributors.select();
        BrowseContributors.waitForContributorToAppear(testData.contributorName, true, true);
        BrowseContributors.waitForContributorToAppear(testData.contributorName, true, false);
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
});
