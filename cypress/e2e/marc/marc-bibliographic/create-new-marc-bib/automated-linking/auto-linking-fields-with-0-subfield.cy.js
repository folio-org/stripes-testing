import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'New title',
          },
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$a value',
            status: 'not linked',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$0 n99036051',
            boxFourth: '$a Hosanna Bible',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n99036051',
            boxSeventh: '',
            status: 'linked',
          },
          {
            rowIndex: 6,
            tag: '610',
            content: '$0 001002x',
            status: 'not linked',
          },
          {
            rowIndex: 7,
            tag: '711',
            content: '$j something $0 n79084169C388560 $2 fast',
            boxFourth:
              '$a C388560Roma Council $n (2nd : $d 1962-1965 : $c Basilica di San Pietro in Roma)',
            boxFifth: '$j something',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n79084169C388560',
            boxSeventh: '$2 fast',
            status: 'linked',
          },
          {
            rowIndex: 8,
            tag: '830',
            content: '$a something $d 1900-2000 $0 no2011188423',
            boxFourth: '$a C388560Robinson eminent scholar lecture series',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/no2011188423',
            boxSeventh: '',
            status: 'linked',
          },
        ];

        let userData = {};

        const linkableFields = [100, 240, 610, 711, 830];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC388560-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388560-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388560-3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388560-4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388560-5.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
        ];

        const createdAuthorityIDs = [];
        let createdInstanceID;

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388560*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              createdAuthorityIDs.push(response[0].authority.id);
            });
          });
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          InventoryInstance.deleteInstanceViaApi(createdInstanceID);
        });

        it(
          'C388560 Auto-linking fields having "$0" when creating new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388560'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
              cy.wait(500);
            });
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 240, 711, and 830 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.checkCallout(
              'Field 610 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            newFields.forEach((newField) => {
              if (newField.status === 'linked') {
                QuickMarcEditor.verifyTagFieldAfterLinking(
                  newField.rowIndex + 1,
                  newField.tag,
                  '\\',
                  '\\',
                  `${newField.boxFourth}`,
                  `${newField.boxFifth}`,
                  `${newField.boxSixth}`,
                  `${newField.boxSeventh}`,
                );
              } else {
                QuickMarcEditor.verifyTagFieldNotLinked(
                  newField.rowIndex + 1,
                  newField.tag,
                  '\\',
                  '\\',
                  newField.content,
                );
              }
            });
            QuickMarcEditor.addNewField('700', '$a smth $0 3052044', 9);
            QuickMarcEditor.updateExistingField('610', '$0 n93094742');
            cy.wait(1500);
            QuickMarcEditor.pressSaveAndClose();

            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdInstanceID = id;
            });
            InventoryInstance.viewSource();
            newFields.forEach((newField) => {
              if (newField.status === 'linked') {
                InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, true);
              } else {
                InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
              }
            });
            QuickMarcEditor.closeEditorPane();
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            newFields.forEach((newField) => {
              if (newField.status === 'linked') {
                QuickMarcEditor.verifyTagFieldAfterLinking(
                  newField.rowIndex + 1,
                  newField.tag,
                  '\\',
                  '\\',
                  `${newField.boxFourth}`,
                  `${newField.boxFifth}`,
                  `${newField.boxSixth}`,
                  `${newField.boxSeventh}`,
                );
              } else if (newField.tag !== '610') {
                QuickMarcEditor.verifyTagFieldNotLinked(
                  newField.rowIndex + 1,
                  newField.tag,
                  '\\',
                  '\\',
                  newField.content,
                );
              }
            });
            QuickMarcEditor.verifyTagFieldNotLinked(7, '610', '\\', '\\', '$0 n93094742');
            QuickMarcEditor.verifyTagFieldNotLinked(10, '700', '\\', '\\', '$a smth $0 3052044');
          },
        );
      });
    });
  });
});
