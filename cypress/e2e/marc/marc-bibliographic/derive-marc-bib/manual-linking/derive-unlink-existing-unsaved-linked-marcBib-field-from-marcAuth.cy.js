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
        };
        const fields = [
          {
            tag: '700',
            rowIndex: 75,
            content:
              '$a C366553 Sprouse, Chris, $e artist. $0 http://id.loc.gov/authorities/names/no98105698',
            newContent: '$a',
            marcValue: 'C366553 Sprouse, Chris',
            searchOption: 'Keyword',
            bib700AfterLinkingToAuth100: [
              75,
              '700',
              '1',
              '\\',
              '$a C366553 Sprouse, Chris',
              '',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            ],
            bib700AfterUnlinking: [75, '700', '1', '\\', '$a'],
          },
          {
            tag: '700',
            rowIndex: 77,
            content: '$a C366553 Sabino, Joe, $e letterer.',
            newContent: '$a C366553 Sabino, J. $e Musician',
            marcValue: 'C366553 Sabino, Joe',
            searchOption: 'Keyword',
            bib700AfterLinkingToAuth100: [
              77,
              '700',
              '1',
              '\\',
              '$a C366553 Sabino, Joe',
              '$e Musician',
              '$0 http://id.loc.gov/authorities/names/no2011137752',
              '',
            ],
            bib700AfterUnlinking: [77, '700', '1', '\\', '$a C366553 Sabino, J. $e Musician'],
          },
          {
            tag: '700',
            rowIndex: 78,
            content:
              '$a C366553 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
            marcValue: 'C366553 Lee, Stan,',
            searchOption: 'Keyword',
            bib700AfterLinkingToAuth100: [
              78,
              '700',
              '1',
              '\\',
              '$a C366553 Lee, Stan, $d 1922-2018',
              '$e creator.',
              '$0 http://id.loc.gov/authorities/names/n83169267',
              '',
            ],
            bib700AfterUnlinking: [
              78,
              '700',
              '1',
              '\\',
              '$a C366553 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
            ],
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC366553.mrc',
            fileName: `C366553 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC366553.mrc',
            fileName: `C366553 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC366553_1.mrc',
            fileName: `C366553 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC366553_2.mrc',
            fileName: `C366553 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Creating user and test data', () => {
          cy.loginAsAdmin();
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366553"',
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
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBib();
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
          'C366553 Derive | Unlink existing unsaved linked "MARC Bib" field from "MARC Authority" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366553'] },
          () => {
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
            MarcAuthorities.checkRecordDetailPageMarkedValue(fields[0].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[0].tag, fields[0].rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fields[0].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickLinkIconInTagField(fields[1].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(fields[1].searchOption, fields[1].marcValue);
            MarcAuthorities.checkRecordDetailPageMarkedValue(fields[1].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[1].tag, fields[1].rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fields[1].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickLinkIconInTagField(fields[2].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(fields[2].searchOption, fields[2].marcValue);
            MarcAuthorities.checkRecordDetailPageMarkedValue(fields[2].marcValue);
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
