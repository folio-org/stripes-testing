import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag100: '100',
            tag245: '245',
            tag650: '650',
            tag800: '800',
          },
          fieldContents: {
            tag245Content: 'AT_C389480_New title',
            tag100Content: '$a AT_C389480_Kerouac, Jack, $d 1922-1969 $0 n80036674',
            tag650Content: '$a C389480 smth $0 n00000010',
            tag800Content: '$a C389480 smth2 $0 n0255869',
          },
          successCalloutMessage: 'Field 100 has been linked to MARC authority record(s).',
          errorNoMatchMessage: 'Field 650 must be set manually by selecting the link icon.',
          errorMultipleMatchMessage:
            'Field 800 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
        };

        const marcFiles = [
          {
            marc: 'C389480MarcAuth1.mrc',
            fileName: `C389480_testMarcAuth1_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389480MarcAuth2.mrc',
            fileName: `C389480_testMarcAuth2_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389480MarcAuth3.mrc',
            fileName: `C389480_testMarcAuth3_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const linkableFields = [100, 650, 800];
        const createdAuthorityIDs = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C389480*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          if (userData.userId) {
            Users.deleteViaApi(userData.userId);
          }
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          if (createdInstanceId) {
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          }
        });

        it(
          'C389480 All three messages shown for one field each when auto-linking fields when creating "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389480', 'nonParallel'] },
          () => {
            // Step 1: Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
            InventoryInstances.createNewMarcBibRecord();
            QuickMarcEditor.waitLoading();

            // Step 2: Fill "$a" value in "245" field
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );

            // Step 3: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
            // Step 4: Select any values from the dropdowns of "008" field which are highlighted in red
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 5: Add three linkable fields (100, 650, 800)
            // Step 6: Replace "$a" in fourth boxes of added linkable fields with appropriate "$0" values
            // Add field 100 with $0 matching single authority record
            MarcAuthority.addNewField(
              4,
              testData.tags.tag100,
              testData.fieldContents.tag100Content,
              '1',
              '\\',
            );

            // Add field 650 with $0 NOT matching any authority record
            MarcAuthority.addNewField(
              5,
              testData.tags.tag650,
              testData.fieldContents.tag650Content,
              '\\',
              '7',
            );

            // Add field 800 with $0 matching multiple authority records
            MarcAuthority.addNewField(
              6,
              testData.tags.tag800,
              testData.fieldContents.tag800Content,
              '1',
              '\\',
            );
            // Step 7: Click on the "Link headings" button in the upper right corner of page
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1500);

            // Step 7a: Verify only field 100 (with $0 matching one authority record) was linked
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              testData.tags.tag100,
              '1',
              '\\',
              '$a AT_C389480_Kerouac, Jack, $d 1922-1969',
              '',
              '$0 http://id.loc.gov/authorities/names/n80036674',
              '',
            );

            // Step 7b: Success toast notification is displayed for field 100
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);

            // Step 7c: Verify field 650 (no match) is NOT linked
            QuickMarcEditor.verifyTagFieldNotLinked(
              6,
              testData.tags.tag650,
              '\\',
              '7',
              testData.fieldContents.tag650Content,
            );

            // Step 7d: Error toast notification is displayed for field 650
            QuickMarcEditor.checkCallout(testData.errorNoMatchMessage);

            // Step 7e: Verify field 800 (multiple matches) is NOT linked
            QuickMarcEditor.verifyTagFieldNotLinked(
              7,
              testData.tags.tag800,
              '1',
              '\\',
              testData.fieldContents.tag800Content,
            );

            // Step 7f: Error toast notification is displayed for field 800
            QuickMarcEditor.checkCallout(testData.errorMultipleMatchMessage);

            // Step 7g: Verify "Link headings" button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 8: Click "Save & close" button
            QuickMarcEditor.saveAndCloseWithValidationWarnings();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.url().then((url) => {
              createdInstanceId = url.split('/')[5].split('?')[0];
            });

            // Step 9: Click on the "Actions" in the third pane → Select "View source" option
            InventoryInstance.viewSource();

            // Step 9a: Verify only field 100 has MARC authority app icon displayed next to it
            // Field 100 should be linked (index 5 in source view)
            InventoryViewSource.verifyLinkedToAuthorityIcon(5, true);
            InventoryViewSource.contains('AT_C389480_Kerouac, Jack');
            InventoryViewSource.contains('$0 http://id.loc.gov/authorities/names/n80036674');

            // Fields 650 and 800 should NOT be linked
            InventoryViewSource.verifyLinkedToAuthorityIcon(6, false);
            InventoryViewSource.verifyLinkedToAuthorityIcon(7, false);
          },
        );
      });
    });
  });
});
