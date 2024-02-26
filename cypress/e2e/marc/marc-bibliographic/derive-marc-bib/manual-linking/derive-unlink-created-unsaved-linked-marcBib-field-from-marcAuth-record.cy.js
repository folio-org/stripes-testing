import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          createdRecordIDs: [],
        };
        const newFields = [
          {
            tag: '700',
            rowIndex: 84,
            content: '$a',
            searchOption: 'Keyword',
            marcValue: 'C366555 Sprouse, Chris',
            bib700AfterLinkingToAuth100: [
              84,
              '700',
              '\\',
              '\\',
              '$a C366555 Sprouse, Chris',
              '',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            ],
            bib700AfterUnlinking: [84, '700', '\\', '\\', '$a'],
          },
          {
            tag: '700',
            rowIndex: 85,
            content: '$a C366555 Sabino, J.',
            searchOption: 'Keyword',
            marcValue: 'C366555 Sabino, Joe',
            bib700AfterLinkingToAuth100: [
              85,
              '700',
              '\\',
              '\\',
              '$a C366555 Sabino, Joe',
              '',
              '$0 http://id.loc.gov/authorities/names/no2011137752',
              '',
            ],
            bib700AfterUnlinking: [85, '700', '\\', '\\', '$a C366555 Sabino, J.'],
          },
        ];
        const marcFiles = [
          {
            marc: 'marcBibFileForC366555.mrc',
            fileName: `C366555 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileC366555.mrc',
            fileName: `C366555 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
          {
            marc: 'marcAuthFileC366555_1.mrc',
            fileName: `C366555 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        before('Creating user and test data', () => {
          cy.loginAsAdmin();
          cy.getAdminToken().then(() => {
            // make sure there are no duplicate authority records in the system
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366555"',
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
                response.entries.forEach((record) => {
                  testData.createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
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
            });
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C366555 Derive | Unlink created unsaved linked "MARC Bib" field from "MARC Authority" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.addNewField(newFields[0].tag, newFields[0].content, 83);
            QuickMarcEditor.addNewField(newFields[1].tag, newFields[1].content, 84);

            QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthoritiesSearch.searchBy(newFields[0].searchOption, newFields[0].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(
              newFields[0].rowIndex,
              newFields[0].tag,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(...newFields[0].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickLinkIconInTagField(newFields[1].rowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthoritiesSearch.searchBy(newFields[1].searchOption, newFields[1].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(
              newFields[1].rowIndex,
              newFields[1].tag,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(...newFields[1].bib700AfterLinkingToAuth100);

            QuickMarcEditor.clickUnlinkIconInTagField(newFields[0].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            cy.wait(1000);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...newFields[0].bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(newFields[0].rowIndex);

            QuickMarcEditor.clickUnlinkIconInTagField(newFields[1].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            cy.wait(1000);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...newFields[1].bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(newFields[1].rowIndex);

            QuickMarcEditor.deleteField(newFields[0].rowIndex);
            QuickMarcEditor.deleteField(newFields[0].rowIndex);
            QuickMarcEditor.verifyNoFieldWithContent(newFields[1].content);
          },
        );
      });
    });
  });
});
