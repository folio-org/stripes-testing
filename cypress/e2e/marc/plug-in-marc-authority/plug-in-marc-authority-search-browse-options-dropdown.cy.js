import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  MARC_AUTHORITY_BROWSE_OPTIONS,
  JOB_STATUS_NAMES,
} from '../../../support/constants';

describe('plug-in MARC authority | Search | Browse', () => {
  const user = {};
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  };

  let createdAuthorityID;

  before('Creating user and test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ])
      .then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
      })
      .then(() => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      })
      .then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityID = link.split('/')[5];
        });
      })
      .then(() => {
        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(createdAuthorityID);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon('700');
        MarcAuthorities.switchToSearch();
        MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD);
      });
  });

  after('Deleting created user and test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
  });

  it(
    'C422043 Search / Browse options dropdowns in "Select MARC authority" plugin modal (spitfire)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.checkSearchOptionsInDropdownInOrder();
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME);
      MarcAuthorities.checkBrowseOptionsInDropdownInOrder();
    },
  );
});
