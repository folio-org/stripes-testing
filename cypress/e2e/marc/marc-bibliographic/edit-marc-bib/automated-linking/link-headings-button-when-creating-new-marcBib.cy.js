import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
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
          },
          fieldContents: {
            tag245Content: 'New title C422145',
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
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 5,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC422145_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422145*');

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
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
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
          { tags: ['criticalPath', 'spitfire', 'C422145'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(testData.tags.tag245, '$a A New Record');
            QuickMarcEditor.updateLDR06And07Positions();
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
              cy.wait(1000);
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              '$a A New Record $0 2052044C388562',
            );
            cy.wait(500);
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[3].tag,
              `${newFieldsForC388562[3].content} $0 y015016`,
            );
            cy.wait(500);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[0].tag,
              `${newFieldsForC388562[0].content} $0 y016017`,
            );
            cy.wait(500);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100 must be set manually by selecting the link icon.',
            );
            InventoryInstance.verifyAndClickLinkIcon(newFieldsForC388562[0].tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption('Identifier (all)', '2052044C388562');
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
            cy.wait(500);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              newFieldsForC388562[1].content,
            );
            cy.wait(500);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              `${newFieldsForC388562[1].content} $0 y011022`,
            );
            cy.wait(500);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[1].tag,
              newFieldsForC388562[1].content,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(
              newFieldsForC388562[2].tag,
              `${newFieldsForC388562[1].content} $0 sh75095299C388562`,
            );
            // need to wait button will be enabled
            cy.wait(2000);
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
