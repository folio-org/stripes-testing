import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      let userData = {};

      const testData = {
        tag010: '010',
        tag100: '100',
        tag010Content: '$a 63943573',
        field100Value: '$a C374163 Clovio, Giulio, $d 1498-1578',
        authorityTitle: 'C374163 Clovio, Giulio, 1498-1578',
        instanceTitle: 'Farnese book of hours :',
        searchOption: 'Keyword',
        searchValue: 'C374163 Clovio, Giulio',
        calloutMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        linked600Field: [
          25,
          '600',
          '1',
          '0',
          '$a C374163 Clovio, Giulio, $d 1498-1578',
          '',
          '$0 http://id.loc.gov/authorities/names/n83073672',
          '',
        ],
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374163.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374163.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          userData = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${testData.authorityTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id, true);
              });
            }
          });

          cy.getAdminToken();
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

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin();
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIconByIndex(25);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(testData.authorityTitle);
            MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.field100Value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field);
            QuickMarcEditor.closeCallout();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C374163 Delete "010" field of linked "MARC Authority" record when "001" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374163'] },
        () => {
          MarcAuthorities.searchByParameter(testData.searchOption, testData.searchValue);

          MarcAuthorities.selectTitle(testData.authorityTitle);

          MarcAuthority.edit();
          QuickMarcEditor.checkContent(testData.tag010Content, 4);

          QuickMarcEditor.checkDeleteButtonExist(4);
          QuickMarcEditor.deleteField(4);
          QuickMarcEditor.afterDeleteNotification(testData.tag010);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkCallout(testData.calloutMessage);
          MarcAuthorities.verifyMarcViewPaneIsOpened();

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.checkResultList([testData.authorityTitle]);

          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(25);
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field);
        },
      );
    });
  });
});
