import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const fieldsToUpdate = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'The most important book',
          },
          searchOptions: {
            personalName: 'Personal name',
          },
          marcValue: 'C380726 Jackson, Peter, 1950-2022 Inspector Banks series ;',
          browseResult: 'C380726 Jackson, Peter, Inspector Banks series ; 1950-2022',
        };

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

        before('Create user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380726');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

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

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[0], true);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
        });

        it(
          'C422134 "$9" validation when creating a new "MARC bib" record (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C422134'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              fieldsToUpdate.tags.tag245,
              `$a ${fieldsToUpdate.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, '100', '');
            MarcAuthority.addNewField(5, '600', 'test');
            cy.wait(500);
            QuickMarcEditor.clickLinkIconInTagField(5);
            MarcAuthorities.searchByParameter(
              fieldsToUpdate.searchOptions.personalName,
              fieldsToUpdate.marcValue,
            );
            MarcAuthorities.selectTitle(fieldsToUpdate.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
              '',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              'records[5].subfieldGroups.uncontrolledAlpha',
              '$9 test',
            );
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkErrorMessage(
              5,
              '$9 is an invalid subfield for linkable bibliographic fields.',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              'records[5].subfieldGroups.uncontrolledAlpha',
              '$9 3d2ecd70-e44c-484b-b372-677a4a070a4b',
            );
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkErrorMessage(
              5,
              '$9 is an invalid subfield for linkable bibliographic fields.',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              'records[5].subfieldGroups.uncontrolledAlpha',
              '',
            );

            QuickMarcEditor.updateExistingFieldContent(6, '$9 test');
            cy.wait(500);
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkErrorMessage(
              6,
              '$9 is an invalid subfield for linkable bibliographic fields.',
            );
            QuickMarcEditor.updateExistingFieldContent(
              6,
              '$9 3d2ecd70-e44c-484b-b372-677a4a070a4b',
            );
            cy.wait(500);
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkErrorMessage(
              6,
              '$9 is an invalid subfield for linkable bibliographic fields.',
            );
            QuickMarcEditor.updateExistingFieldContent(6, 'test');
            cy.wait(500);

            MarcAuthority.addNewField(6, '035', '$a 123123 $9 test');
            cy.wait(500);
            MarcAuthority.addNewField(7, '300', '$9 123123');
            cy.wait(500);
            MarcAuthority.addNewField(8, '588', '$9 test $9 TEST');
            cy.wait(500);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(7, '035', '\\', '\\', '$a 123123 $9 test');
            QuickMarcEditor.verifyTagFieldAfterUnlinking(8, '300', '\\', '\\', '$9 123123');
            QuickMarcEditor.verifyTagFieldAfterUnlinking(9, '588', '\\', '\\', '$9 test $9 TEST');

            QuickMarcEditor.closeEditorPane();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t100\t   \t$a C380726 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ; $0 3052044 $9',
            );
            InventoryViewSource.contains('\t035\t   \t$a 123123 $9 test ');
            InventoryViewSource.contains('\t300\t   \t$9 123123 ');
            InventoryViewSource.contains('\t588\t   \t$9 test $9 TEST ');
          },
        );
      });
    });
  });
});
