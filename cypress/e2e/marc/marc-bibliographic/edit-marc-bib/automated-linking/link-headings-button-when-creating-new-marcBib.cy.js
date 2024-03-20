import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
        const testData = {
          tags: {
            tag245: '245',
            tagLDR: 'LDR',
          },
          fieldContents: {
            tag245Content: 'New title C422145',
            tagLDRContent: '00000naa\\a2200000uu\\4500',
          },
          naturalIds: {
            tag100: '0255863',
            tag240: 'n99036054',
            tag600: 'n93094743',
            tag711: 'n79084160',
          },
          searchOptions: {
            identifierAll: 'Identifier (all)',
          },
          marcValue: 'C422145Radio "Vaticana". Hrvatski program',
        };

        const newFieldsForC388562 = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$a Value100',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$a Value240',
          },
          {
            rowIndex: 6,
            tag: '650',
            content: '$a Value650',
          },
          {
            rowIndex: 7,
            tag: '040',
            content: '$a Value040',
          },
        ];

        let userData = {};

        const linkableFieldsForC388562 = [100, 240, 650];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422145_1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 5,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC422145_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
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
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 8; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
          }
        });

        it(
          'C422145 "Link headings" button disabling/enabling when creating new "MARC Bib" record (spitfire)',
          { tags: ['criticalPath', 'spitfire'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(testData.tags.tag245, '$a A New Record');
            QuickMarcEditor.updateExistingField(
              testData.tags.tagLDR,
              testData.fieldContents.tagLDRContent,
            );
            newFieldsForC388562.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, '');
            });
            cy.getAdminToken();
            linkableFieldsForC388562.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            newFieldsForC388562.forEach((newField) => {
              QuickMarcEditor.updateExistingField(newField.tag, newField.content);
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              '$a A New Record $0 3052044C388562',
            );
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[3].tag,
              `${newFieldsForC388562[3].content} $0 y015016`,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[0].tag,
              `${newFieldsForC388562[0].content} $0 y016017`,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100 must be set manually by selecting the link icon.',
            );
            InventoryInstance.verifyAndClickLinkIcon(newFieldsForC388562[0].tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption('Identifier (all)', '3052044C388562');
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFieldsForC388562[0].tag,
              newFieldsForC388562[0].rowIndex + 1,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              `${newFieldsForC388562[1].content} $0 n99036055`,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              newFieldsForC388562[1].content,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              `${newFieldsForC388562[1].content} $0 y011022`,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              newFieldsForC388562[1].content,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[2].tag,
              `${newFieldsForC388562[1].content} $0 sh85095299C388562`,
            );
            // need to wait button will be enabled
            cy.wait(3000);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
          },
        );
      });
    });
  });
});
