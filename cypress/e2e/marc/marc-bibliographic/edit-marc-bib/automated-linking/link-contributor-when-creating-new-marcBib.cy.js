import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const fieldsToUpdate = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'The most important book',
          },
          searchOptions: {
            personalName: 'Personal name',
            contributor: 'Contributors',
          },
          marcValue: 'C380726 Jackson, Peter, 1950-2022 Inspector Banks series ;',
          browseResult: 'C380726 Jackson, Peter, 1950-2022 Inspector Banks series ;',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '100',
            content: 'test123 $t test',
            browseSearchOption: 'personalNameTitle',
          },
          {
            rowIndex: 6,
            tag: '700',
            content: '',
            browseSearchOption: 'personalNameTitle',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC380726.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380726*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
        });

        it(
          'C422126 Link "Contributor" fields when creating "MARC Bibliographic" record (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C422126'] },
          () => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              fieldsToUpdate.tags.tag245,
              `$a ${fieldsToUpdate.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, newFields[0].tag, `$a ${newFields[0].content}`);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
            MarcAuthority.addNewField(5, newFields[1].tag, `$a ${newFields[1].content}`);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(6);

            newFields.forEach((newField) => {
              QuickMarcEditor.clickLinkIconInTagField(newField.rowIndex);
              MarcAuthorities.checkSearchOption(newField.browseSearchOption);
              MarcAuthorities.searchByParameter(
                fieldsToUpdate.searchOptions.personalName,
                fieldsToUpdate.marcValue,
              );
              MarcAuthorities.selectTitle(fieldsToUpdate.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newField.rowIndex);
            });
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
              '$t test',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              6,
              '700',
              '\\',
              '\\',
              '$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
              '',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
              '$t test',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              6,
              '700',
              '\\',
              '\\',
              '$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
              '',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.closeEditorPane();

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t100\t   \t$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ; $t test $0 3052044 $9',
            );
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t700\t   \t$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ; $0 3052044 $9',
            );
            QuickMarcEditor.closeEditorPane();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            BrowseContributors.waitForContributorToAppear(fieldsToUpdate.browseResult, true, true);
            BrowseContributors.browse(fieldsToUpdate.browseResult);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(fieldsToUpdate.browseResult);
          },
        );
      });
    });
  });
});
