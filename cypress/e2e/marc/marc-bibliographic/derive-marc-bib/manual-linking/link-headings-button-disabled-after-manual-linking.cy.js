import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
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
          tag130: '130',
          tag240: '240',
          tag600: '600',
          instanceTitle: 'C388640 Runaway bride',
          createdRecordIDs: [],
          field130: {
            rowIndex: 16,
            tag: '130',
            searchValue: 'Runaway Bride (Motion picture)',
            naturalId: 'n2002076264',
          },
          field240: {
            rowIndex: 17,
            tag: '240',
            searchValue: 'C388640 Abraham, Angela,',
          },
          field600: {
            rowIndex: 39,
            tag: '600',
            searchValue: 'C388640 Jackson, Peter,',
          },
        };

        const marcFiles = [
          {
            marc: 'C388640MarcBib.mrc',
            fileName: `C388640 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388640MarcAuth_130.mrc',
            fileName: `C388640_130 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388640MarcAuth_Hosanna.mrc',
            fileName: `C388640_Hosanna testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388640MarcAuth_240.mrc',
            fileName: `C388640_240 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Create test data and pre-link field 130', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388640*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ])
            .then((createdUserProperties) => {
              testData.user = createdUserProperties;

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
            })
            .then(() => {
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(testData.field130.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(testData.field130.searchValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                testData.field130.tag,
                testData.field130.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C388640 "Link headings" button disabled after manual linking of linkable fields if no linkable fields with "$0" left (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C388640'] },
          () => {
            // Step 1: Find and open detail view of imported record
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // Step 2: Derive new MARC bib record and keep linking
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3-5: Manually link field 240 (without $0) to authority
            InventoryInstance.verifyAndClickLinkIcon(testData.field240.tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.field240.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 6-8: Manually link field 600 (with $0) - "Link headings" button should disable
            InventoryInstance.verifyAndClickLinkIcon(testData.field600.tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.field600.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field600.rowIndex);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            // Step 9: Save & close the derived record
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Creating record may take several seconds.');
            QuickMarcEditor.checkCallout('Record created.');

            // Step 10: View source and verify authority icons on manually linked fields
            InventoryInstance.viewSource();
            [testData.field130.rowIndex, testData.field240.rowIndex, testData.field600.rowIndex]
              .map((idx) => idx - 2)
              .forEach((adjustedIdx) => {
                InventoryViewSource.verifyLinkedToAuthorityIcon(adjustedIdx, true);
              });
          },
        );
      });
    });
  });
});
