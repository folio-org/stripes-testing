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
      const testData = {
        tag010: '010',
        tag700: '700',
        subfieldZValue: 'n12345',
        updatedSubfieldZValue: 'n12345678910',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileC376596.mrc',
          fileName: `testMarcFileC376596.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          instanceTitle: 'The coronation of Queen Elizabeth II C376596',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileC376596.mrc',
          fileName: `testMarcFileC376596.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          authorityHeading: 'Elizabeth C376596',
          authority010FieldValue: 'n80126296376596',
          propertyName: 'relatedAuthorityInfo',
        },
      ];

      const createdRecordIDs = [];

      before('Creating user, importing and linking records', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
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

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // wait for detail view to be fully loaded
            cy.wait(1500);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[1].authority010FieldValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C376596 Add/Edit/Delete "$z" subfield in "010" field of linked "MARC authority" record when "010" = "$0" (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(`$a ${marcFiles[1].authority010FieldValue}`, 4);
          QuickMarcEditor.updateExistingField(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue} $z ${testData.subfieldZValue}`,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          QuickMarcEditor.updateExistingField(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue} $z ${testData.updatedSubfieldZValue}`,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          QuickMarcEditor.updateExistingField(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue}`,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();

          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            60,
            testData.tag700,
            '0',
            '\\',
            `$a ${marcFiles[1].authorityHeading}`,
            '',
            `$0 http://id.loc.gov/authorities/names/${marcFiles[1].authority010FieldValue}`,
            '',
          );
        },
      );
    });
  });
});
