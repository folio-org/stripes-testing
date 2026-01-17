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
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          createdRecordIDs: [],
          authority010_1FieldValue: 'C366552 Sprouse, Chris',
          authority010_2FieldValue: 'C366552 Sabino, Joe',
          authority010_3FieldValue: 'C366552 Lee, Stan, 1922-2018',
        };
        const fields = [
          {
            tag: '700',
            rowIndex: 75,
            content:
              '$a C336552 Sprouse, Chris, $e artist. $0 http://id.loc.gov/authorities/names/no98105698',
            newContent: '$a',
            searchOption: 'Keyword',
            marcValue: 'C366552 Sprouse, Chris',
            bib700AfterLinkingToAuth100: [
              75,
              '700',
              '1',
              '\\',
              '$a C366552 Sprouse, Chris',
              '',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            ],
            bib700AfterUnlinking: [75, '700', '1', '\\', '$a'],
          },
          {
            tag: '700',
            rowIndex: 77,
            content: '$a C366552 Sabino, Joe, $e letterer.',
            newContent: '$a C366552 Sabino, J. $e Musician',
            marcValue: 'C366552 Sabino, Joe',
            searchOption: 'Keyword',
            bib700AfterLinkingToAuth100: [
              77,
              '700',
              '1',
              '\\',
              '$a C366552 Sabino, Joe',
              '$e Musician',
              '$0 http://id.loc.gov/authorities/names/no2011137752',
              '',
            ],
            bib700AfterUnlinking: [77, '700', '1', '\\', '$a C366552 Sabino, J. $e Musician'],
          },
          {
            tag: '700',
            rowIndex: 78,
            content:
              '$a C366552 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
            marcValue: 'C366552 Lee, Stan,',
            searchOption: 'Keyword',
            bib700AfterLinkingToAuth100: [
              78,
              '700',
              '1',
              '\\',
              '$a C366552 Lee, Stan, $d 1922-2018',
              '$e creator.',
              '$0 http://id.loc.gov/authorities/names/n83169267',
              '',
            ],
            bib700AfterUnlinking: [
              78,
              '700',
              '1',
              '\\',
              '$a C366552 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
            ],
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC366552.mrc',
            fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC366552.mrc',
            fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC366552_1.mrc',
            fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC366552_2.mrc',
            fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Creating user and test data', () => {
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366552"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
          });
        });

        after('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C366552 Unlink existing unsaved linked "MARC Bib" field from "MARC Authority" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366552'] },
          () => {
            InventoryInstance.editMarcBibliographicRecord();
            fields.forEach((field) => {
              QuickMarcEditor.checkLinkButtonExistByRowIndex(field.rowIndex);
            });
            QuickMarcEditor.updateExistingFieldContent(fields[0].rowIndex, fields[0].newContent);
            QuickMarcEditor.checkContent(fields[0].newContent, fields[0].rowIndex);
            QuickMarcEditor.updateExistingFieldContent(fields[1].rowIndex, fields[1].newContent);
            QuickMarcEditor.checkContent(fields[1].newContent, fields[1].rowIndex);
            QuickMarcEditor.clickLinkIconInTagField(fields[0].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(fields[0].searchOption, fields[0].marcValue);
            MarcAuthority.contains(testData.authority010_1FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[0].tag, fields[0].rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fields[0].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickLinkIconInTagField(fields[1].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(fields[1].searchOption, fields[1].marcValue);
            MarcAuthority.contains(testData.authority010_2FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[1].tag, fields[1].rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fields[1].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickLinkIconInTagField(fields[2].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(fields[2].searchOption, fields[2].marcValue);
            MarcAuthority.contains(testData.authority010_3FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[2].tag, fields[2].rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fields[2].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickUnlinkIconInTagField(fields[0].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            cy.wait(1000);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[0].bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(fields[0].rowIndex);

            QuickMarcEditor.clickUnlinkIconInTagField(fields[1].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            cy.wait(1000);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[1].bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(fields[1].rowIndex);

            QuickMarcEditor.clickUnlinkIconInTagField(fields[2].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            cy.wait(1000);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[2].bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(fields[2].rowIndex);
          },
        );
      });
    });
  });
});
