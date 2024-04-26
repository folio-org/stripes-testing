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

describe('Browse in Inventory', () => {
  const testData = {
    contributorName: 'C388531 Lee, Stan, 1922-2018',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC388531.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    },
    {
      marc: 'marcFileForC388531.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      propertyName: 'authority',
    },
  ];

  const tagInfo = [
    {
      rowIndex: 25,
    },
    {
      rowIndex: 26,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating data', () => {
    MarcAuthorities.getMarcAuthoritiesViaApi({
      limit: 100,
      query: 'keyword="C388531" and (authRefType==("Authorized" or "Auth/Ref"))',
    }).then((authorities) => {
      if (authorities) {
        authorities.forEach(({ id }) => {
          MarcAuthority.deleteViaAPI(id);
        });
      }
    });
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.getAdminToken();
      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        tagInfo.forEach((tag) => {
          QuickMarcEditor.clickLinkIconInTagField(tag.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(testData.contributorName);
          InventoryInstance.clickLinkButton();
          InventoryInstance.closeDetailsView();
          InventoryInstance.closeFindAuthorityModal();
        });
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.waitLoading();
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C388531 Verify that contributors with the same "Name" , "Name type" and "authorityID" will display as one row (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributorName);
      BrowseContributors.checkAuthorityIconAndValueDisplayed(testData.contributorName);
    },
  );
});
