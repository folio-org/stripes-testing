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
      describe('Automated linking', () => {
        const testData = {
          createdRecordIDs: [],
          field130: {
            rowIndex: 16,
            tag: '130',
            authorityHeading: 'C388639 Runaway Bride (Motion picture)',
          },
          field240: {
            rowIndex: 17,
            tag: '240',
            searchValue: 'C388639 Abraham, Angela,',
          },
          field600: {
            rowIndex: 39,
            tag: '600',
            searchValue: 'C388639 Robertson, Peter, 1950-2022',
          },
          field711: {
            rowIndex: 55,
            tag: '711',
          },
          successCalloutMessage: 'Field 711 has been linked to MARC authority record(s).',
          errorCalloutMessage: 'Field 650 and 830 must be set manually by selecting the link icon.',
        };

        const marcFiles = [
          {
            marc: 'C388639MarcBib.mrc',
            fileName: `C388639 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388639MarcAuth1.mrc',
            fileName: `C388639_1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388639MarcAuth2.mrc',
            fileName: `C388639_2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388639MarcAuth3.mrc',
            fileName: `C388639_3 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388639MarcAuth4.mrc',
            fileName: `C388639_4 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388639MarcAuth5.mrc',
            fileName: `C388639_5 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [240, 600, 650, 711, 830];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388639*');

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

          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

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
            InventoryInstance.searchResults(testData.field130.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.field130.tag,
              testData.field130.rowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

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
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C388639 Link certain fields manually and then use auto-linking when deriving new "MARC Bib" record ("$0" in linkable fields) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C388639'] },
          () => {
            // Step 1: Find and open detail view of imported record
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Derive new MARC bib record and keep linking
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Steps 3-5: Manually link field 240 (without $0) to authority via keyword search
            InventoryInstance.verifyAndClickLinkIcon(testData.field240.tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.field240.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);

            // Steps 6-8: Manually link field 600 (with $0) to authority via keyword search
            InventoryInstance.verifyAndClickLinkIcon(testData.field600.tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.field600.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field600.rowIndex);

            // Step 9: Click "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();

            // Verify pre-linked field 130 remains linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex);
            // Verify manually linked fields 240 and 600 remain linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field600.rowIndex);
            // Verify field 711 was auto-linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field711.rowIndex);

            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 10: Save & close derived record
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();

            // Step 11: View source and verify authority icons on all linked fields
            InventoryInstance.viewSource();
            [
              testData.field130.rowIndex,
              testData.field240.rowIndex,
              testData.field600.rowIndex,
              testData.field711.rowIndex,
            ].forEach((rowIndex) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(rowIndex - 2, true);
            });
          },
        );
      });
    });
  });
});
