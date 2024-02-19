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
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        tag400: '400',
        tag035: '035',
        update400Field: '$ test 400 field',
        update035Field: '$ test 035 field',
        authorityTitle:
          'C374160 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374160.mrc',
          fileName: `testMarcFileC374160.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          instanceTitle: 'C374160 Variations / Ludwig Van Beethoven.',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC374160.mrc',
          fileName: `testMarcFileC374160.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          authorityHeading: 'C374160 Beethoven, Ludwig van',
          propertyName: 'relatedAuthorityInfo',
        },
      ];

      const linkingTagAndValues = {
        tag: '240',
        rowIndex: 18,
        value: 'C374160 Beethoven, Ludwig van',
        boxFourth: '$m piano, violin, cello, $n op. 44, $r E♭ major $a Variations,',
        boxFifth: '',
        boxSifth: '$0 http://id.loc.gov/authorities/names/n83130832',
        boxSeventh: '',
      };

      const createdRecordIDs = [];

      before('Creating user, importing and linking records', () => {
        // make sure there are no duplicate authority records in the system
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C374160"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            },
          );

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

          cy.loginAsAdmin();
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(linkingTagAndValues.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValues.tag,
              linkingTagAndValues.rowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C374160 Edit any field value of linked "MARC Authority" record but not "1XX" and "010" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingFieldContent(12, testData.update400Field);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          QuickMarcEditor.updateExistingField(testData.tag035, testData.update035Field);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventorySearchAndFilter.verifyInstanceDisplayed(marcFiles[0].instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues.rowIndex,
            linkingTagAndValues.tag,
            '1',
            '0',
            linkingTagAndValues.boxFourth,
            linkingTagAndValues.boxFifth,
            linkingTagAndValues.boxSifth,
            linkingTagAndValues.boxSeventh,
          );
        },
      );
    });
  });
});
