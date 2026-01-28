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
      describe('Automated linking', () => {
        let userData = {};

        const testData = {
          searchAuthorityQueries: [
            'C436814 Whiteread, Rachel, 1963-',
            'C436814 Martini, Carlo Maria, 1927-2012. Works. Selections',
            'C436814 St. Louis Art Museum',
            'C436814 Tate Britain (Gallery)',
            'C436814 Action and adventure fiction',
          ],
          url: 'http://id.loc.gov/',
          calloutMessage:
            'Field 100, 240, 655, and 710 has been linked to MARC authority record(s).',
          marcAuthIcon: 'Linked to MARC authority',
        };

        const linkedTags = [
          [
            11,
            '100',
            '1',
            '\\',
            '$a C436814 Whiteread, Rachel, $d 1963-',
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
            '$a C436814 Action and adventure fiction',
            '',
            '$0 https://vocabularyserver.com/gsafd/gsafd2014026218',
            '$2 lcgft',
          ],
          [
            25,
            '710',
            '2',
            '\\',
            '$a C436814 Tate Britain (Gallery)',
            '$e organizer, $e host institution.',
            '$0 http://linking.com/automated/tests/protocolhttp/os000208081',
            '',
          ],
          [
            26,
            '710',
            '2',
            '\\',
            '$a C436814 St. Louis Art Museum',
            '$e host institution.',
            '$0 https://linking.com/automated/tests/protocolhttps/osw790055911',
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
            marc: 'marcBibFileForC436814.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC436814.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 5,
            propertyName: 'authority',
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
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
            const titles = ['C436830*', 'C436821*', 'C436829*', 'C436814*'];
            titles.forEach((title) => {
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
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
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
          // TO DO: remove `failOnStatusCode = false` after MODELINKS-210 is done
          for (let i = 0; i < 2; i++) {
            cy.deleteAuthoritySourceFileViaAPI(createdAuthSources[i], true);
          }
        });

        it(
          'C436814 Protocol is displayed in subfield "$0" of automatically linked field when field has no base URL before linking (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C436814'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(/Edit .*MARC record/);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.checkValueAbsent(11, testData.url);
            QuickMarcEditor.checkValueAbsent(12, testData.url);
            QuickMarcEditor.checkValueAbsent(24, testData.url);
            QuickMarcEditor.checkValueAbsent(25, testData.url);
            QuickMarcEditor.checkValueAbsent(26, testData.url);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.calloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t100\t1  \t$a C436814 Whiteread, Rachel, $d 1963- $e artist. $0 http://id.loc.gov/authorities/names/nr94042914 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t240\t1 0\t$a Works. $k Selections $0 2018019878 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t655\t  7\t$a C436814 Action and adventure fiction $0 https://vocabularyserver.com/gsafd/gsafd2014026218 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t2  \t$a C436814 Tate Britain (Gallery) $e organizer, $e host institution. $0 http://linking.com/automated/tests/protocolhttp/os000208081 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t710\t2  \t$a C436814 St. Louis Art Museum $e host institution. $0 https://linking.com/automated/tests/protocolhttps/osw790055911 $9`,
            );
          },
        );
      });
    });
  });
});
