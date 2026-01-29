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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag100: '100',
          createdRecordIDs: [],
          bib100AfterLinkingToAuth100: [
            11,
            '100',
            '1',
            '\\',
            '$a C366578 Chin, Staceyann, $d 1972-',
            '$e Author $e Narrator',
            '$0 http://id.loc.gov/authorities/names/n2008052404',
            '$1 http://viaf.org/viaf/24074052',
          ],
          bib100AfterUnlinking: [
            11,
            '100',
            '1',
            '\\',
            '$a C366578 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 http://id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
          ],
          contributorName: 'C366578 Chin, Staceyann,',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366578.mrc',
            fileName: `C366578 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC366578.mrc',
            fileName: `C366578 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValue = {
          rowIndex: 11,
          value: 'C366578 Chin, Staceyann,',
          tag: 100,
        };

        before('Creating user and records', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366578"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
          });
          cy.loginAsAdmin();
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

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.visit(TopMenu.inventoryPath).then(() => {
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValue.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValue.tag,
                linkingTagAndValue.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user and records', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C366578 Delete unlinked field of "MARC Bib" record in editing window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366578'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValue.rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
            QuickMarcEditor.checkLinkButtonExist(testData.tag100);
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.deleteField(linkingTagAndValue.rowIndex);
            QuickMarcEditor.afterDeleteNotification(testData.tag100);
            QuickMarcEditor.clickSaveAndCloseThenCheck(1);
            QuickMarcEditor.constinueWithSaveAndCheckInstanceRecord();
            InventoryInstance.verifyContributorAbsent(testData.contributorName);
          },
        );
      });
    });
  });
});
