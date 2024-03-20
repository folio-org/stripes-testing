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
        tag700: '700',
        tag010RowIndex: 4,
        tag700RowIndex: 56,
        field100Value: '$a Roberts, Julia, $d 1967-',
        field010Value: '$a n  91074080 ',
        new010tagValue: '01',
        searchOption: 'Keyword',
        searchValue: 'Roberts',
        authorityTitle: 'Roberts, Julia, 1967-',
        instanceTitle: 'Runaway bride',
        linked700Field: [
          56,
          '700',
          '1',
          '\\',
          '$a Roberts, Julia, $d 1967-',
          '$e Actor.',
          '$0 http://id.loc.gov/authorities/names/n91074080',
          '',
        ],
        colloutMessage: 'Cannot delete 010. It is required.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374161.mrc',
          fileName: `testMarcFileC374161.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374161.mrc',
          fileName: `testMarcFileC374161.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
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

          cy.loginAsAdmin();
          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag700RowIndex);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(testData.authorityTitle);
            MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.field100Value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.tag700,
              testData.tag700RowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked700Field);
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
        'C374161 Delete "010" field of linked "MARC Authority" record when "010 $a" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchByParameter(testData.searchOption, testData.searchValue);

          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthorities.getViewPaneContent();
          MarcAuthority.edit();
          cy.wait(2000);

          QuickMarcEditor.checkContent(testData.field010Value, testData.tag010RowIndex);

          QuickMarcEditor.checkDeleteButtonNotExist(testData.tag010RowIndex);

          QuickMarcEditor.updateExistingTagName(testData.tag010, testData.new010tagValue);
          QuickMarcEditor.checkDeleteButtonExist(testData.tag010RowIndex);

          QuickMarcEditor.deleteField(testData.tag010RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.new010tagValue);
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
          QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag700RowIndex);
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked700Field);
        },
      );
    });
  });
});
