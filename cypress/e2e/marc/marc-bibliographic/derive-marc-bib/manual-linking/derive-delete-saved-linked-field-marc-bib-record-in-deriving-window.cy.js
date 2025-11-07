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
          tag700: '700',
          createdRecordIDs: [],
          contributor: 'Coates, Ta-Nehisi',
          bib100AfterLinkingToAuth100: [
            32,
            '100',
            '1',
            '\\',
            '$a C366574 Coates, Ta-Nehisi',
            '$e author.',
            '$0 http://id.loc.gov/authorities/names/n2008001084',
            '',
          ],
          bib700AfterLinkingToAuth100: [
            75,
            '700',
            '1',
            '\\',
            '$a C366574 Sprouse, Chris',
            '$e artist.',
            '$0 http://id.loc.gov/authorities/names/nb98017694',
            '',
          ],
          marcAuthIcon: 'Linked to MARC authority',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366574.mrc',
            fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC366574.mrc',
            fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            contributorName: 'C366574 Sprouse, Chris',
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC366574_1.mrc',
            fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            contributorName: 'C366574 Coates, Ta-Nehisi',
            propertyName: 'authority',
          },
        ];
        const linkingTagAndValues = [
          {
            tag: '100',
            rowIndex: 32,
            value: 'C366574 Coates, Ta-Nehisi',
          },
          {
            tag: '700',
            rowIndex: 75,
            value: 'C366574 Sprouse, Chris',
          },
        ];

        before('Creating test data', () => {
          cy.loginAsAdmin();
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366574"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id, true);
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
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.visit(TopMenu.inventoryPath).then(() => {
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              linkingTagAndValues.forEach((linking) => {
                QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linking.value);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
              });
              QuickMarcEditor.pressSaveAndClose();
              cy.wait(1500);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1], true);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[2], true);
        });

        it(
          'C366574 Derive | Delete saved linked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366574'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
            QuickMarcEditor.deleteField(75);
            QuickMarcEditor.afterDeleteNotification(testData.tag700);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.clickSaveAndCloseThenCheck(1);
            QuickMarcEditor.confirmDeletingFields();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.verifyContributorAbsent(marcFiles[1].contributorName);
            InventoryInstance.verifyContributor(
              0,
              1,
              `${testData.marcAuthIcon}${marcFiles[2].contributorName}`,
            );
          },
        );
      });
    });
  });
});
