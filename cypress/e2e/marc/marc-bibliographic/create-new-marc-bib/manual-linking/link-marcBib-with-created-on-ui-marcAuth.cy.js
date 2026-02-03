import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'Test: linking with created MARC authority',
          },
          marcAuthIcon: 'Linked to MARC authority',
          newAuthorityHeaderText: /Create a new .*MARC authority record/,
          sourceName: 'LC Name Authority file (LCNAF)',
          markedValue: 'John Doe',
          accordionContributor: 'Contributor',
          contributor: 'John Doe Sir, 1909-1965 eng',
          naturalId: 'n00776439',
          searchOption: 'Keyword',
          marcAuthTitle: 'John Doe Sir, 1909-1965',
        };
        const dropdownSelections = {
          'Geo Subd': 'a',
          Roman: 'a',
          Lang: 'b',
          'Kind rec': 'a',
          'Cat Rules': 'b',
          'SH Sys': 'a',
          Series: 'b',
          'Numb Series': 'a',
          'Main use': 'a',
          'Subj use': 'a',
          'Series use': 'a',
          'Type Subd': 'a',
          'Govt Ag': 'a',
          RefEval: 'a',
          RecUpd: 'a',
          'Pers Name': 'b',
          'Level Est': 'a',
          'Mod Rec': 'a',
          Source: 'a',
        };

        const newFields = [
          { previousFieldTag: '008', tag: '010', content: '$a n  00776439' },
          {
            previousFieldTag: '010',
            tag: '100',
            content: '$a John Doe $c Sir, $d 1909-1965 $l eng',
          },
        ];

        const newFieldForMarcBib = {
          rowIndex: 4,
          tag: '700',
          content: '$0 n00776439',
        };

        const createdAuthorityIDs = [];

        let userData = {};

        before(() => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C423565');
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
            cy.login(userData.username, userData.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
          ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
        });

        it(
          'C423565 Link MARC Bib with created on UI MARC authority record (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C423565'] },
          () => {
            // Creating marc authority part
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            QuickMarcEditor.checkPaneheaderContains(testData.newAuthorityHeaderText);
            MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);
            MarcAuthority.checkSourceFileSelectShown();
            MarcAuthority.selectSourceFile(testData.sourceName);
            newFields.forEach((newField) => {
              MarcAuthority.addNewFieldAfterExistingByTag(
                newField.previousFieldTag,
                newField.tag,
                newField.content,
              );
            });
            QuickMarcEditor.checkContentByTag(newFields[0].tag, newFields[0].content);
            QuickMarcEditor.checkContentByTag(newFields[1].tag, newFields[1].content);
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.verifyAfterSaveAndClose();
            QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.newAuthorityHeaderText);
            MarcAuthority.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });
            MarcAuthority.contains(newFields[0].tag);
            MarcAuthority.contains(newFields[0].content);
            MarcAuthority.contains(newFields[1].tag);
            MarcAuthority.contains(newFields[1].content);

            // Creating marc bib part and linking
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(
              newFieldForMarcBib.rowIndex,
              newFieldForMarcBib.tag,
              newFieldForMarcBib.content,
            );
            QuickMarcEditor.checkLinkButtonExistByRowIndex(5);

            InventoryInstance.verifyAndClickLinkIcon(newFieldForMarcBib.tag);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('advancedSearch');
            MarcAuthorities.checkSearchInput('identifiers.value exactPhrase n00776439');
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFieldForMarcBib.tag, 5);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              newFieldForMarcBib.tag,
              '\\',
              '\\',
              `${newFields[1].content}`,
              '',
              '$0 http://id.loc.gov/authorities/names/n00776439',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordionContributor,
              `${testData.marcAuthIcon}\n${testData.contributor}`,
            );
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordionContributor,
            );
            MarcAuthorities.checkFieldAndContentExistence(newFields[1].tag, testData.markedValue);
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.checkRecordsResultListIsAbsent();
            MarcAuthorities.searchByParameter(testData.searchOption, testData.naturalId);
            MarcAuthorities.checkRow(testData.marcAuthTitle);
            MarcAuthorities.verifyNumberOfTitles(5, '1');
          },
        );
      });
    });
  });
});
