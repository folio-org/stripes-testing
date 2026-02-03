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
      describe('Manual linking', () => {
        let userData = {};

        const testData = {
          tag245: '245',
          tag245Content: 'Record for linking: base URL with "http://" protocol before linking',
          searchAuthorityQueries: [
            'C436829 Whiteread, Rachel, 1963-',
            'C436829 Martini, Carlo Maria, 1927-2012. Works. Selections',
            'C436829 St. Louis Art Museum',
            'C436829 Tate Britain (Gallery)',
            'C436829 Action and adventure fiction',
          ],
          marcAuthIcon: 'Linked to MARC authority',
        };

        const linkedTags = [
          [
            5,
            '100',
            '\\',
            '\\',
            '$a C436829 Whiteread, Rachel, $d 1963-',
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
            '$a C436829 Action and adventure fiction',
            '',
            '$0 https://vocabularyserver.com/gsafd/gsafd2014026217',
            '$2 lcgft',
          ],
          [
            8,
            '710',
            '\\',
            '\\',
            '$a C436829 Tate Britain (Gallery)',
            '$e organizer, $e host institution.',
            '$0 http://linking.com/automated/tests/protocolhttp/os000208089',
            '',
          ],
          [
            9,
            '710',
            '\\',
            '\\',
            '$a C436829 St. Louis Art Museum',
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
            marc: 'marcAuthFileForC436829.mrc',
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
              '$a C436829 Whiteread, Rachel, $e artist. $0 https://id.loc.gov/authorities/names/nr94042914',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$a C436829 Works. $0 https://notspecifiedsource/2018019878',
          },
          {
            rowIndex: 6,
            tag: '655',
            content:
              '$a C436829 Adventire $2 lcgft $0 https://vocabularyserver.com/gsafd/gsafd2014026217',
          },
          {
            rowIndex: 7,
            tag: '710',
            content:
              '$a C436829 Tate Britain (Gallery), $e organizer, $e host institution. $0 https://linking.com/os000208089',
          },
          {
            rowIndex: 8,
            tag: '710',
            content:
              '$a C436829 St. Louis Art Museum, $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055919',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 5,
            value: 'C436829 Whiteread, Rachel, 1963-',
            tag: 100,
          },
          {
            rowIndex: 6,
            value: 'C436829 Martini, Carlo Maria 1927-2012. Works. Selections',
            tag: 240,
          },
          {
            rowIndex: 7,
            value: 'C436829 Action and adventure fiction',
            tag: 655,
          },
          {
            rowIndex: 8,
            value: 'C436829 Tate Britain (Gallery)',
            tag: 710,
          },
          {
            rowIndex: 9,
            value: 'C436829 St. Louis Art Museum',
            tag: 710,
          },
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

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
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
          'C436829 Protocol is displayed in subfield "$0" of manually linked field when field has base URL with "http://" protocol before linking (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C436829'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.checkPaneheaderContains(/Create a new .*MARC bib record/);
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            });
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdRecordIDs.push(id);
            });

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t100\t   \t$a C436829 Whiteread, Rachel, $d 1963- $e artist. $0 http://id.loc.gov/authorities/names/nr94042914 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t240\t   \t$a Works. $k Selections $0 2018019878 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t655\t   \t$a C436829 Action and adventure fiction $0 https://vocabularyserver.com/gsafd/gsafd2014026217 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t   \t$a C436829 Tate Britain (Gallery) $e organizer, $e host institution. $0 http://linking.com/automated/tests/protocolhttp/os000208089 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t   \t$a C436829 St. Louis Art Museum $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055919 $9`,
            );
          },
        );
      });
    });
  });
});
