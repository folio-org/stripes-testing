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
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};

        const testData = {
          tag245: '245',
          tag245Content: 'Record for linking: base URL with "https://" protocol before linking',
          searchAuthorityQueries: [
            'C436825 Whiteread, Rachel, 1963-',
            'C436825 Martini, Carlo Maria, 1927-2012. Works. Selections',
            'C436825 St. Louis Art Museum',
            'C436825 Tate Britain (Gallery)',
            'C436825 Action and adventure fiction',
          ],
          calloutMessage:
            'Field 100, 240, 655, and 710 has been linked to MARC authority record(s).',
          marcAuthIcon: 'Linked to MARC authority',
        };

        const linkedTags = [
          [
            5,
            '100',
            '\\',
            '\\',
            '$a C436825 Whiteread, Rachel, $d 1963-',
            '$e artist.',
            '$0 http://id.loc.gov/authorities/names/nr94042914',
            '',
          ],
          [6, '240', '\\', '\\', '$a Works. $k Selections', '', '$0 2018019878', ''],
          [
            7,
            '655',
            '\\',
            '\\',
            '$a C436825 Action and adventure fiction',
            '',
            '$0 https://vocabularyserver.com/gsafd/gsafd2014026217',
            '$2 lcgft',
          ],
          [
            8,
            '710',
            '\\',
            '\\',
            '$a C436825 Tate Britain (Gallery)',
            '$e organizer, $e host institution.',
            '$0 http://linking.com/automated/tests/protocolhttp/os000208089',
            '',
          ],
          [
            9,
            '710',
            '\\',
            '\\',
            '$a C436825 St. Louis Art Museum',
            '$e host institution.',
            '$0 https://linking.com/automated/tests/protocolhttps/osw790055919',
            '',
          ],
        ];

        const newMarcAuthoritySources = [
          {
            sourceName: `Test auth source file ${getRandomPostfix()}`,
            prefix: 'os',
            startWithNumber: '1',
            isChecked: false,
            baseUrl: 'http://linking.com/automated/tests/protocolhttp',
          },
          {
            sourceName: `Test auth source file ${getRandomPostfix()}`,
            prefix: 'osw',
            startWithNumber: '1',
            isChecked: false,
            baseUrl: 'https://linking.com/automated/tests/protocolhttps',
          },
        ];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC436825.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 5,
            propertyName: 'authority',
          },
        ];

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content:
              '$a C436825 Whiteread, Rachel, $e artist. $0 https://id.loc.gov/authorities/names/nr94042914',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$a C436825 Works. $0 https://notspecifiedsource/2018019878',
          },
          {
            rowIndex: 6,
            tag: '655',
            content:
              '$a C436825 Adventire $2 lcgft $0 https://vocabularyserver.com/gsafd/gsafd2014026217',
          },
          {
            rowIndex: 7,
            tag: '710',
            content:
              '$a C436825 Tate Britain (Gallery), $e organizer, $e host institution. $0 https://linking.com/os000208089',
          },
          {
            rowIndex: 8,
            tag: '710',
            content:
              '$a C436825 St. Louis Art Museum, $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055919',
          },
        ];

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];

        const createdRecordIDs = [];
        const createdAuthSources = [];

        before(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            testData.searchAuthorityQueries.forEach((query) => {
              MarcAuthorities.getMarcAuthoritiesViaApi({
                limit: 100,
                query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
              }).then((authorities) => {
                if (authorities) {
                  authorities.forEach(({ id }) => {
                    MarcAuthority.deleteViaAPI(id);
                  });
                }
              });
            });

            newMarcAuthoritySources.forEach((source) => {
              cy.createAuthoritySourceFileUsingAPI(
                source.prefix,
                source.startWithNumber,
                source.sourceName,
                source.isChecked,
                source.baseUrl,
                // TO DO: remove `failOnStatusCode = false` after MODELINKS-210 is done
                true,
              ).then((sourceId) => {
                createdAuthSources.push(sourceId);
              });
            });

            cy.getAdminToken();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 5; i++) {
            MarcAuthority.deleteViaAPI(createdRecordIDs[i]);
          }
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[5]);
          // TO DO: remove `failOnStatusCode = false` after MODELINKS-210 is done
          for (let i = 0; i < 2; i++) {
            cy.deleteAuthoritySourceFileViaAPI(createdAuthSources[i], true);
          }
        });

        it(
          'C436825 Protocol is displayed in subfield "$0" of automatically linked field when field has base URL with "https://" protocol before linking (spitfire)',
          { tags: ['criticalPath', 'spitfire'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.checkPaneheaderContains('Create a new MARC bib record');
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            });
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.calloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdRecordIDs.push(id);
            });

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t100\t   \t$a C436825 Whiteread, Rachel, $d 1963- $e artist. $0 http://id.loc.gov/authorities/names/nr94042914 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t240\t   \t$a Works. $k Selections $0 2018019878 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t655\t   \t$a C436825 Action and adventure fiction $0 https://vocabularyserver.com/gsafd/gsafd2014026217 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t   \t$a C436825 Tate Britain (Gallery) $e organizer, $e host institution. $0 http://linking.com/automated/tests/protocolhttp/os000208089 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t   \t$a C436825 St. Louis Art Museum $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055919 $9`,
            );
          },
        );
      });
    });
  });
});
