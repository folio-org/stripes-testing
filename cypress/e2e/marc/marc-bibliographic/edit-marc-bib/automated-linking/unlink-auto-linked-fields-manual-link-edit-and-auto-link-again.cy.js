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
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'New title',
          },
          searchOptions: {
            identifierAll: 'Identifier (all)',
          },
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$0 y011012',
            naturalId: '$0 3052044C388568',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$0 y011013',
            naturalId: '$0 n99036055C388568',
          },
          {
            rowIndex: 6,
            tag: '610',
            content: '$0 y011014',
            naturalId: '$0 n93094742C388568',
          },
          {
            rowIndex: 7,
            tag: '711',
            content: '$0 y011015',
            naturalId: '$0 n79084169C388568',
          },
          {
            rowIndex: 8,
            tag: '811',
            content: '$0 y011016',
            naturalId: '$0 n85281584C388568',
          },
          {
            rowIndex: 9,
            tag: '830',
            content: '$0 y011017',
            naturalId: '$0 no2011188426C388568',
          },
        ];

        let userData = {};

        const linkableFields = [100, 240, 610, 711, 811, 830];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC388568.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 8,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388568*');

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
          });
        });

        beforeEach('Sign in to platform', () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 8; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
          }
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[8]);
        });

        it(
          'C422150 Unlink auto-linked fields, manually link, edit and auto-link fields again when creating new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C422150'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            });
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            cy.wait(3000);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 610, 711, 811, and 830 must be set manually by selecting the link icon.',
            );

            newFields.forEach((newField) => {
              QuickMarcEditor.updateExistingField(newField.tag, newField.naturalId);
            });
            cy.wait(3000);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 610, 711, 811, and 830 has been linked to MARC authority record(s).',
            );

            for (let i = 5; i < 9; i++) {
              QuickMarcEditor.clickUnlinkIconInTagField(i);
              QuickMarcEditor.confirmUnlinkingField();
              cy.wait(500);
            }
            QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex + 1);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption(
              testData.searchOptions.identifierAll,
              '3052007C388568',
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[0].tag,
              newFields[0].rowIndex + 1,
            );
            QuickMarcEditor.updateExistingField(newFields[1].tag, '$0 n2016004081C388568');
            QuickMarcEditor.updateExistingField(newFields[2].tag, '');
            QuickMarcEditor.deleteFieldAndCheck(newFields[4].rowIndex + 1, newFields[4].tag);
            QuickMarcEditor.clickArrowDownButton(newFields[0].rowIndex + 1);

            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(8);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
            QuickMarcEditor.checkFieldAbsense(newFields[4].tag);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(9);
            QuickMarcEditor.checkCallout(
              'Field 240 and 711 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t240\t   \t$a Wakanda Forever $0 http://id.loc.gov/authorities/names/n2016004081C388568 $9',
            );
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t100\t   \t$a C388568 Robertson, Peter, $d 1950-2022 $c Inspector Banks series ; $0 3052007C388568 $9',
            );
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t711\t   \t$a C388568 Roma Council $n (2nd : $d 1962-1965 : $c Basilica di San Pietro in Roma) $0 http://id.loc.gov/authorities/names/n79084169C388568 $9',
            );
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t830\t   \t$a C388568 Robinson eminent scholar lecture series $0 http://id.loc.gov/authorities/names/no2011188426C388568 $9',
            );
          },
        );
      });
    });
  });
});
