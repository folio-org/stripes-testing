import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const user = {};
      const searchValue = `name${getRandomPostfix()}`;
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      let recordID;
      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  recordID = record[marcFile.propertyName].id;
                });
              });
            },
          );

          cy.login(user.userProperties.username, user.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(recordID);
        });
      });

      it(
        "C359180 MARC Authority plug-in | Use search query that doesn't return results (spitfire) (TaaS)",
        { tags: ['extendedPath', 'spitfire', 'C359180'] },
        () => {
          InventoryInstances.searchByTitle(recordID);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickLinkIconInTagField(17);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchByParameter('Keyword', searchValue);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${searchValue}". Please check your spelling and filters.`,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent();
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('0 results found');
        },
      );
    });
  });
});
