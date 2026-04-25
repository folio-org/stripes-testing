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
            authorityHeading: 'C388646 Runaway Bride (Motion picture)',
          },
          field240: {
            rowIndex: 17,
            tag: '240',
            searchValue: 'C388646 Black Panther (Fictitious character)',
          },
          field600: {
            rowIndex: 39,
            tag: '600',
          },
          field610: {
            rowIndex: 40,
            tag: '610',
            newContent: '$a Value610 $0 n93016434',
          },
          field650: {
            rowIndex: 41,
            tag: '650',
            newContent: '$a Man-woman relationships $v Drama.',
          },
          field700: {
            rowIndex: 52,
            tag: '700',
          },
          field711: {
            rowIndex: 53,
            tag: '711',
          },
          field830: {
            rowIndex: 57,
            tag: '830',
          },
          successCalloutStep3:
            'Field 240, 610, 650, 700, 711, and 830 has been linked to MARC authority record(s).',
          errorCalloutStep3: 'Field 600 must be set manually by selecting the link icon.',
          successCalloutStep12: 'Field 610 and 711 has been linked to MARC authority record(s).',
          errorCalloutStep12: 'Field 600 must be set manually by selecting the link icon.',
        };

        const marcFiles = [
          {
            marc: 'C388646MarcBib.mrc',
            fileName: `C388646 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388646MarcAuth1.mrc',
            fileName: `C388646_Auth1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth2.mrc',
            fileName: `C388646_Auth2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth3.mrc',
            fileName: `C388646_Auth3 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth4.mrc',
            fileName: `C388646_Auth4 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth5.mrc',
            fileName: `C388646_Auth5 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth6.mrc',
            fileName: `C388646_Auth6 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth7.mrc',
            fileName: `C388646_Auth7 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth8.mrc',
            fileName: `C388646_Auth8 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388646MarcAuth9.mrc',
            fileName: `C388646_Auth9 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [240, 600, 610, 650, 700, 711, 830];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388646*');
          InventoryInstances.deleteInstanceByTitleViaApi('C388646*');

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
          'C388646 Unlink auto-linked fields, manually link, edit and auto-link fields again when deriving new "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C388646'] },
          () => {
            // Step 1: Find and open detail view of imported record
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Derive new MARC bib record and keep linking
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" button - auto-links matching fields
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.checkCallout(testData.successCalloutStep3);
            QuickMarcEditor.checkCallout(testData.errorCalloutStep3);

            // Verify 130 remains linked (pre-linked in before hook), 240/610/650/700/711/830 auto-linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field610.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field650.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field700.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field711.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field830.rowIndex);

            // Step 4: Unlink 5 auto-linked fields (240, 610, 650, 700, 711) - leave 830 linked
            [
              testData.field240.rowIndex,
              testData.field610.rowIndex,
              testData.field650.rowIndex,
              testData.field700.rowIndex,
              testData.field711.rowIndex,
            ].forEach((rowIndex) => {
              QuickMarcEditor.clickUnlinkIconInTagField(rowIndex);
              QuickMarcEditor.confirmUnlinkingField();
              cy.wait(500);
            });

            // Steps 5-7: Manually link field 240 using keyword search
            QuickMarcEditor.clickLinkIconInTagField(testData.field240.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.field240.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);

            // Step 8: Update $0 value in field 610 to match another authority (AUTH6 - Carleton)
            QuickMarcEditor.updateExistingFieldContent(
              testData.field610.rowIndex,
              testData.field610.newContent,
            );

            // Step 9: Delete $0 value from field 650
            QuickMarcEditor.updateExistingField(
              testData.field650.tag,
              testData.field650.newContent,
            );

            // Step 10: Delete field 700
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.field700.tag);

            // Step 11: Move field 240 above field 130 (click arrow up on 240)
            QuickMarcEditor.moveFieldUp(testData.field240.rowIndex);

            // Step 12: Click "Link headings" button again
            // After: 700 deleted (711 shifted to row 52, 830 shifted to row 56), 240 moved up to row 16
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.checkCallout(testData.successCalloutStep12);
            QuickMarcEditor.checkCallout(testData.errorCalloutStep12);

            // Verify 240 (moved to row 16) and 130 (shifted to row 17) remain linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex - 1);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex + 1);

            // Verify 610 and 711 are now auto-linked; 830 still linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field610.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field711.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field830.rowIndex);

            // Verify deleted field 700 is absent
            QuickMarcEditor.checkFieldAbsense(testData.field700.tag);

            // Step 13: Save & close the derived record
            QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
            QuickMarcEditor.checkAfterSaveAndCloseDerive();

            // Step 14: View source - verify MARC authority icons on linked fields only
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('130', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('240', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('610', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('711', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('830', true);
          },
        );
      });
    });
  });
});
