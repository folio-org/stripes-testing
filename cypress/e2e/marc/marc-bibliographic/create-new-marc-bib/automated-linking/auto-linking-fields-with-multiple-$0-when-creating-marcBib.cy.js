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
          },
          fieldContents: {
            tag245Content: 'C422153 New title',
            tag100Content: '$a someone $0 3052328889 $0 3052044 $0 971255',
            tag650Content: '$0 sh85095299 $0 y022024 $0 y022025',
          },
          errorMessage:
            'Field 100 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
          successMessage: 'Field 650 has been linked to MARC authority record(s).',
        };

        const marcFiles = [
          {
            marc: 'C422153MarcAuth1.mrc',
            fileName: `C422153_testMarcAuth1_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C422153MarcAuth2.mrc',
            fileName: `C422153_testMarcAuth2_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C422153MarcAuth3.mrc',
            fileName: `C422153_testMarcAuth3_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C422153MarcAuth4.mrc',
            fileName: `C422153_testMarcAuth4_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const linkableFields = [100, 650];
        const createdAuthorityIDs = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422153*');

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
          'C422153 Auto-linking fields with multiple "$0" when creating new "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C422153'] },
          () => {
            // Step 1: Click on "Actions" button in second pane → Select "+ New MARC bibliographic record" option
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

            // Step 5: Add two linkable fields (100 and 650)
            // Step 6: Replace "$a" in fourth boxes of added linkable fields with appropriate "$0" values
            // Add field 100 with multiple $0 where two match authority naturalIds
            MarcAuthority.addNewField(
              4,
              testData.tags.tag100,
              testData.fieldContents.tag100Content,
              '1',
              '\\',
            );

            // Add field 650 with multiple $0 where only one matches authority naturalId
            MarcAuthority.addNewField(
              5,
              testData.tags.tag650,
              testData.fieldContents.tag650Content,
              '\\',
              '7',
            );

            // Step 7: Click on the "Link headings" button placed in the upper right corner of pane header
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1500);

            // Verify field 100 was NOT linked (multiple matches)
            QuickMarcEditor.verifyTagFieldNotLinked(
              5,
              testData.tags.tag100,
              '1',
              '\\',
              testData.fieldContents.tag100Content,
            );

            // Verify field 650 WAS linked (single match)
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);

            // Verify error toast notification for field 100
            QuickMarcEditor.checkCallout(testData.errorMessage);

            // Verify success toast notification for field 650
            QuickMarcEditor.checkCallout(testData.successMessage);

            // Verify Link headings button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 8: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Capture instance ID for cleanup
            cy.url().then((url) => {
              createdInstanceId = url.split('/')[5].split('?')[0];
            });

            // Step 9: Click on the "Actions" in the third pane → Select "View source"
            InventoryInstance.viewSource();

            // Verify MARC authority app icon is NOT displayed next to field 100
            InventoryViewSource.verifyLinkedToAuthorityIcon(5, false);

            // Verify MARC authority app icon IS displayed next to field 650
            InventoryViewSource.verifyLinkedToAuthorityIcon(6, true);

            // Verify content is preserved
            InventoryViewSource.contains('someone');
            InventoryViewSource.contains('3052328889');
            InventoryViewSource.contains('sh85095299');
          },
        );
      });
    });
  });
});
