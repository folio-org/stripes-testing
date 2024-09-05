import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
    describe('plug-in MARC authority | Search', () => {
      const user = {};
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
      };
      const searchOption = '*';
      let createdAuthorityID;

      before('Creating user and test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ])
          .then((createdUserProperties) => {
            user.userProperties = createdUserProperties;
          })
          .then(() => {
            cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityID = record.instance.id;
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
            MarcAuthorities.switchToSearch();
          });
      });

      after('Deleting created user and test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
      });

      it(
        'C422029 MARC Authority plug-in | Verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBeats(searchOption);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkResetAllButtonDisabled(false);
          MarcAuthorities.clickResetAndCheck(searchOption);
          MarcAuthorities.checkResetAllButtonDisabled();
          MarcAuthorities.checkSearchInputInFocus();
        },
      );
    });
  });
});
