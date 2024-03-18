import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const user = {};
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      };
      const searchValue = 'test';
      let createdAuthorityID;

      before('Creating user and test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdAuthorityID = record.relatedInstanceInfo.idList[0];
              });
            });
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          })
          .then(() => {
            InventoryInstances.searchByTitle(createdAuthorityID);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon('700');
            MarcAuthorities.switchToBrowse();
          });
      });

      after('Deleting created user and test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
      });

      it(
        'C422028 MARC Authority plug-in | Verify that clicking on "Reset all" button will return focus and cursor to the Browse box (spitfire)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchByParameter('Geographic name', searchValue);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkResetAllButtonDisabled(false);
          MarcAuthorities.clickReset();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.checkDefaultBrowseOptions(searchValue);
          MarcAuthorities.checkResetAllButtonDisabled();
          MarcAuthorities.checkSearchInputInFocus();
        },
      );
    });
  });
});
