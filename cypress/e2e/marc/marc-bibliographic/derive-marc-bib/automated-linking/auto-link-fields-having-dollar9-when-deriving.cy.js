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
            tag: '130',
            rowIndex: 16,
            authorityHeading: 'C388649 Runaway Bride (Motion picture)',
          },

          field240: {
            tag: '240',
            rowIndex: 17,
            authorityHeading: 'C388649 Bridges, Jeff,',
            contentWithDollar9:
              '$a Runaway Bride $0 no2021099999 $9 812ef396-4451-48b3-b99c-6e59df6330e8',
          },

          // Non-linkable field: $9 must be preserved after Link headings
          field245: {
            tag: '245',
            rowIndex: 18,
            editRowIndex: 16,
            sourceViewRowIndex: 16,
            contentWithDollar9: '$a C388649 Runaway bride/ $c Derive-4 $9 001002',
          },

          // Auto-linked: $0 matches Auth2 LCCN
          field610: {
            tag: '610',
            rowIndex: 40,
            contentWithDollar9: '$a Radio "Vaticana". $0 n93094742 $9 test',
          },

          // Not auto-linked: no matching authority for $0
          field650: {
            tag: '650',
            rowIndex: 41,
            sourceViewRowIndex: 39,
            contentWithDollar9:
              '$a Test subject $0 sh99999999 $9 812ef396-4451-48b3-b99c-6e59df6330e0',
          },

          // Not auto-linked: no matching authority for $0
          field711: {
            tag: '711',
            rowIndex: 52,
            sourceViewRowIndex: 50,
            contentWithDollar9: '$a Test conference $0 n99999999 $9 testing',
          },

          errorCallout: 'Field 650 and 711 must be set manually by selecting the link icon.',
        };

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];

        const marcFiles = [
          {
            marc: 'C388649MarcBib.mrc',
            fileName: `C388649 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388649MarcAuth1.mrc',
            fileName: `C388649_Auth1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388649MarcAuth2.mrc',
            fileName: `C388649_Auth2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388649MarcAuth3.mrc',
            fileName: `C388649_Auth3 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388649MarcAuth4.mrc',
            fileName: `C388649_Auth4 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Create test data', () => {
          cy.getAdminToken();

          // Make sure there are no duplicate authority records
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388649*');
          InventoryInstances.deleteInstanceByTitleViaApi('C388649*');

          // Import MARC files
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

          // Enable auto-linking rules for all linkable fields
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

            // Manually link field 130 as precondition
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              InventoryInstance.verifyAndClickLinkIcon(testData.field130.tag);
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
            });
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);

          // Delete instance (first record)
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);

          // Delete authority records (remaining records)
          testData.createdRecordIDs.forEach((id, index) => {
            if (index > 0) {
              MarcAuthority.deleteViaAPI(id);
            }
          });
        });

        it(
          'C388649 Auto-link fields having "$9" when deriving new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388649'] },
          () => {
            // Step 1: Find and open detail view of record from precondition
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Click on "Actions" button → Select "Derive new MARC bibliographic record" → Click "Keep linking"
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Add "$9" values (valid UUID and not valid UUID) to linkable fields
            QuickMarcEditor.updateExistingFieldContent(
              testData.field240.rowIndex,
              testData.field240.contentWithDollar9,
            );
            QuickMarcEditor.updateExistingFieldContent(
              testData.field610.rowIndex,
              testData.field610.contentWithDollar9,
            );
            QuickMarcEditor.updateExistingFieldContent(
              testData.field650.rowIndex,
              testData.field650.contentWithDollar9,
            );
            QuickMarcEditor.updateExistingFieldContent(
              testData.field711.rowIndex,
              testData.field711.contentWithDollar9,
            );

            // Step 4: Add "$9" value (not valid UUID) to non-linkable field 245
            QuickMarcEditor.updateExistingFieldContent(
              testData.field245.rowIndex,
              testData.field245.contentWithDollar9,
            );

            // Step 5: Click on the "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.errorCallout);

            // Verify user-added $9 stripped from unlinked linkable fields (650, 711)
            QuickMarcEditor.checkValueAbsent(testData.field650.rowIndex, '$9');
            QuickMarcEditor.checkValueAbsent(testData.field711.rowIndex, '$9');

            // Verify $9 remains in non-linkable field (245)
            QuickMarcEditor.checkValueExist(testData.field245.rowIndex, '$9');

            // Verify linking status
            QuickMarcEditor.verifyRowLinked(testData.field240.rowIndex, true);
            QuickMarcEditor.verifyRowLinked(testData.field610.rowIndex, true);
            QuickMarcEditor.verifyRowLinked(testData.field650.rowIndex, false);
            QuickMarcEditor.verifyRowLinked(testData.field711.rowIndex, false);

            // Verify "Link headings" button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 6: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Creating record may take several seconds.');
            QuickMarcEditor.checkCallout('Record created.');
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 7: Click on "Actions" → Select "View source" option
            InventoryInstance.viewSource();

            // Verify MARC authority app icon displayed next to linked fields (130, 240, 610)
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.field130.tag);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.field240.tag);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.field610.tag);

            // Verify user-added $9 stripped from unlinked linkable fields (650, 711)
            InventoryViewSource.verifyAbsenceOfValueInRow(
              '$9',
              testData.field650.sourceViewRowIndex,
            );
            InventoryViewSource.verifyAbsenceOfValueInRow(
              '$9',
              testData.field711.sourceViewRowIndex,
            );

            // Verify $9 preserved in non-linkable field (245)
            InventoryViewSource.verifyExistanceOfValueInRow(
              '$9',
              testData.field245.sourceViewRowIndex,
            );

            // Step 8: Click "x" icon to close source view
            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            // Step 9: Click "Actions" → Select "Edit MARC bibliographic record"
            InventoryInstance.editMarcBibliographicRecord();

            // Verify manually and auto-linked fields shown as linked (130, 240, 610)
            QuickMarcEditor.verifyRowLinked(testData.field130.rowIndex, true);
            QuickMarcEditor.verifyRowLinked(testData.field240.rowIndex, true);
            QuickMarcEditor.verifyRowLinked(testData.field610.rowIndex, true);

            // Verify user-added $9 stripped from unlinked linkable fields (650, 711)
            QuickMarcEditor.checkValueAbsent(testData.field650.rowIndex, '$9');
            QuickMarcEditor.checkValueAbsent(testData.field711.rowIndex, '$9');

            // Verify $9 remains in non-linkable field
            QuickMarcEditor.checkValueExist(testData.field245.editRowIndex, '$9');

            // Verify "Link headings" button is enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
          },
        );
      });
    });
  });
});
