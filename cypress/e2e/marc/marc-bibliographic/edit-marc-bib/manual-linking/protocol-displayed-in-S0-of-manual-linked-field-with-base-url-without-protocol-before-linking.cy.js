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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        let userData = {};

        const testData = {
          searchAuthorityQueries: [
            'C436828 Whiteread, Rachel, 1963-',
            'C436828 Martini, Carlo Maria, 1927-2012. Works. Selections',
            'C436828 St. Louis Art Museum',
            'C436828 Tate Britain (Gallery)',
            'C436828 Action and adventure fiction',
          ],
          url: 'https://',
          marcAuthIcon: 'Linked to MARC authority',
        };

        const linkedTags = [
          [
            11,
            '100',
            '1',
            '\\',
            '$a C436828 Whiteread, Rachel, $d 1963-',
            '$e artist.',
            '$0 http://id.loc.gov/authorities/names/nr94042914',
            '',
          ],
          [12, '240', '1', '0', '$a Works. $k Selections', '', '$0 2018019878', ''],
          [
            24,
            '655',
            '\\',
            '7',
            '$a C436828 Action and adventure fiction',
            '',
            '$0 https://vocabularyserver.com/gsafd/gsafd2014026217',
            '$2 lcgft',
          ],
          [
            25,
            '710',
            '2',
            '\\',
            '$a C436828 Tate Britain (Gallery)',
            '$e organizer, $e host institution.',
            '$0 http://linking.com/automated/tests/protocolhttp/os000208089',
            '',
          ],
          [
            26,
            '710',
            '2',
            '\\',
            '$a C436828 St. Louis Art Museum',
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
            marc: 'marcBibFileForC436828.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC436828.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 5,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 11,
            value: 'C436828 Whiteread, Rachel, 1963-',
            tag: 100,
          },
          {
            rowIndex: 12,
            value: 'C436828 Martini, Carlo Maria 1927-2012. Works. Selections',
            tag: 240,
          },
          {
            rowIndex: 24,
            value: 'C436828 Action and adventure fiction',
            tag: 655,
          },
          {
            rowIndex: 25,
            value: 'C436828 Tate Britain (Gallery)',
            tag: 710,
          },
          {
            rowIndex: 26,
            value: 'C436828 St. Louis Art Museum',
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
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
          // TO DO: remove `failOnStatusCode = false` after MODELINKS-210 is done
          for (let i = 0; i < 2; i++) {
            cy.deleteAuthoritySourceFileViaAPI(createdAuthSources[i], true);
          }
        });

        it(
          'C436828 Protocol is displayed in subfield "$0" of manually linked field when field has base URL without protocol before linking (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C436828'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(/Edit .*MARC record/);
            QuickMarcEditor.checkValueAbsent(11, testData.url);
            QuickMarcEditor.checkValueAbsent(12, testData.url);
            QuickMarcEditor.checkValueAbsent(24, testData.url);
            QuickMarcEditor.checkValueAbsent(25, testData.url);
            QuickMarcEditor.checkValueAbsent(26, testData.url);
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
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t100\t1  \t$a C436828 Whiteread, Rachel, $d 1963- $e artist. $0 http://id.loc.gov/authorities/names/nr94042914 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t240\t1 0\t$a Works. $k Selections $0 2018019878 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t655\t  7\t$a C436828 Action and adventure fiction $0 https://vocabularyserver.com/gsafd/gsafd2014026217 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t2  \t$a C436828 Tate Britain (Gallery) $e organizer, $e host institution. $0 http://linking.com/automated/tests/protocolhttp/os000208089 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t2  \t$a C436828 St. Louis Art Museum $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055919 $9`,
            );
          },
        );
      });
    });
  });
});
