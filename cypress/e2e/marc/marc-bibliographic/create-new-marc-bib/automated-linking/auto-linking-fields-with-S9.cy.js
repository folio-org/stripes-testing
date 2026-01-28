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
      describe('Automated linking', () => {
        const testData = {
          createdRecordIDs: [],
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: `$a C422151 New title ${getRandomPostfix()} $9 TEST`,
          },
          bib100AfterLinkingToAuth100: [
            5,
            '100',
            '\\',
            '\\',
            '$a C422151 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
            '',
            '$0 3052039422151',
            '',
          ],
          bib240AfterLinkingToAuth100: [
            6,
            '240',
            '\\',
            '\\',
            '$a Hosanna Bible',
            '',
            '$0 http://id.loc.gov/authorities/names/n99036049422151',
            '',
          ],
          successCalloutMessage: 'Field 100 and 240 has been linked to MARC authority record(s).',
          errorCalloutMessage: 'Field 610 and 711 must be set manually by selecting the link icon.',
        };
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$0 3052039422151 $9 812ef396-4451-48b3-b99c-6e59df6330e8',
            status: 'linked',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$0 n99036049422151 $9 test',
            status: 'linked',
          },
          {
            rowIndex: 6,
            tag: '610',
            content: '$a smth $0 y000111422151 $9 812ef396-4451-48b3-b99c-6e59df6330e0',
            contentWithout$9: '$a smth $0 y000111422151',
            status: 'not linked',
          },
          {
            rowIndex: 7,
            tag: '711',
            content: '$a smth2 $0 y000222422151 $9 testing',
            contentWithout$9: '$a smth2 $0 y000222422151',
            status: 'not linked',
          },
        ];
        const marcFiles = [
          {
            marc: 'marcAuthFileForC422151_1.mrc',
            fileName: `C422151_1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC422151_2.mrc',
            fileName: `C422151_2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
        ];

        before('Creating test data', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C422151"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
          });

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              testData.createdRecordIDs.push(response[0].authority.id);
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Deleting test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          testData.createdRecordIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          InventoryInstance.deleteInstanceViaApi(testData.createdInstanceID);
        });

        it(
          'C422151 Auto-link fields having "$9" when creating new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C422151'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              testData.fieldContents.tag245Content,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            });
            cy.wait(1000);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
            QuickMarcEditor.closeCallout();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib240AfterLinkingToAuth100);
            QuickMarcEditor.checkContent(newFields[2].contentWithout$9, 7);
            QuickMarcEditor.checkContent(newFields[3].contentWithout$9, 8);
            QuickMarcEditor.checkContent(testData.fieldContents.tag245Content, 4);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              testData.createdInstanceID = id;
            });
            InventoryInstance.viewSource();
            newFields.forEach((newField) => {
              if (newField.status === 'linked') {
                InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, true);
              } else {
                InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
              }
            });
            InventoryViewSource.notContains(newFields[0].content);
            InventoryViewSource.notContains(newFields[1].content);
            InventoryViewSource.notContains(newFields[2].content);
            InventoryViewSource.notContains(newFields[3].content);
            InventoryViewSource.contains(testData.fieldContents.tag245Content);
          },
        );
      });
    });
  });
});
