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
        tag100RowIndex: 16,
        field100Value: '$a Erbil,',
        new010FieldValue: '$z n 03766001',
        searchOption: 'Keyword',
        authorityTitle: 'Erbil, H. Yıldırım',
        instanceTitle: 'Surface chemistry of solid and liquid interfaces / H. Yıldırım Erbil.',
        linked100Field: [
          16,
          '100',
          '1',
          '\\',
          '$a Erbil, H. Yıldırım',
          '',
          '$0 http://id.loc.gov/authorities/names/n00376600',
          '',
        ],
        colloutMessage: 'Cannot remove 010 $a for this record.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC376600.mrc',
          fileName: `testMarcFileC376600.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC376600.mrc',
          fileName: `testMarcFileC376600.${getRandomPostfix()}.mrc`,
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

          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${testData.authorityTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });

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
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(testData.authorityTitle);
            MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.field100Value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.closeCallout();
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(3000);
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
        'C376600 Verify that user cant delete "$a" subfield from "010" field of linked "MARC Authority" record when "$z" is present and "010" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C376600'] },
        () => {
          MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);

          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthorities.getViewPaneContent();
          MarcAuthority.edit();

          QuickMarcEditor.updateExistingField(testData.tag010, testData.new010FieldValue);
          cy.wait(2000);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(4, testData.colloutMessage);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          cy.wait(3000);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(4, testData.colloutMessage);

          QuickMarcEditor.pressCancel();
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          cy.get('@viewAuthorityPaneContent').then((viewAuthorityPaneContent) => {
            MarcAuthorities.verifyViewPaneContent(viewAuthorityPaneContent);
          });

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.checkResultList([testData.authorityTitle]);

          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag100RowIndex);
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
        },
      );
    });
  });
});
