import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      contributorName: 'Lee, Stanley Test C359596',
    };

    const marcFiles = [
      {
        marc: 'marcBibC359596.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthC359596_1.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        naturalId: 'n831692600011181',
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthC359596_2.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        naturalId: 'n831692600011182',
        propertyName: 'authority',
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
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        InventoryInstances.deleteInstanceByTitleViaApi('C359596*');
        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
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
          authRefresh: true,
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C359596 Verify that contributors with the same "Name", "Name type" and different "authorityID" will display in different rows in the response (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C359596'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        BrowseContributors.select();
        BrowseContributors.waitForContributorToAppear(testData.contributorName, true, true);
        BrowseContributors.browse(testData.contributorName);
        BrowseContributors.checkAuthorityIconAndValueDisplayedForMultipleRows(
          2,
          testData.contributorName,
        );
      },
    );
  });
});
