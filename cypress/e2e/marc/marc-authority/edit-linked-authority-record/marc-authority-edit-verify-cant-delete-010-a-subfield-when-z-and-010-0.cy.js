import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import AreYouSureModal from '../../../../support/fragments/orders/modals/areYouSureModal';
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
        new010FieldValue: '$z n 2005070769',
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
          '$0 http://id.loc.gov/authorities/names/n00000912',
          '',
        ],
        colloutMessage: 'Cannot remove 010 $a for this record.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC376600.mrc',
          fileName: `testMarcFileC376600.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC376600.mrc',
          fileName: `testMarcFileC376600.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          propertyName: 'relatedAuthorityInfo',
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
              response.entries.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
              });
            });
          });

          cy.loginAsAdmin();
          cy.visit(TopMenu.inventoryPath).then(() => {
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
            cy.wait(1000);

            cy.login(userData.username, userData.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
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
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);

          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthorities.getViewPaneContent();
          MarcAuthority.edit();

          QuickMarcEditor.updateExistingField(testData.tag010, testData.new010FieldValue);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.colloutMessage);
          QuickMarcEditor.closeCallout();

          QuickMarcEditor.pressSaveAndKeepEditing(testData.colloutMessage);
          QuickMarcEditor.closeCallout();

          QuickMarcEditor.pressCancel();
          AreYouSureModal.clickCloseWithoutSavingButton();
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
