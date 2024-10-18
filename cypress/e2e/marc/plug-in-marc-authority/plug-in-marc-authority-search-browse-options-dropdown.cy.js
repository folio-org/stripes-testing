import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    const user = {};
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityID = record.instance.id;
            });
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
      { tags: ['extendedPath', 'spitfire', 'C422043'] },
      () => {
        MarcAuthorities.checkSearchOptionsInDropdownInOrder();
        MarcAuthorities.switchToBrowse();
        MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME);
        MarcAuthorities.checkBrowseOptionsInDropdownInOrder();
      },
    );
  });
});
