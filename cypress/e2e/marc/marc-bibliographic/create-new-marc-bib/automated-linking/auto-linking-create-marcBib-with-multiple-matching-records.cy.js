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
          },
          fieldContents: {
            tag245Content: 'C422152 New title',
            tag100Content: '$a test $0 n99036055',
          },
          errorMessage: 'Field 100 must be set manually by selecting the link icon.',
        };

        const marcFiles = [
          {
            marc: 'C422152MarcAuth1.mrc',
            fileName: `C422152_testMarcAuth1_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C422152MarcAuth2.mrc',
            fileName: `C422152_testMarcAuth2_${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const linkableField = 100;
        const createdAuthorityIDs = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422152*');

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

            QuickMarcEditor.setRulesForField(linkableField, true);

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
          QuickMarcEditor.setRulesForField(linkableField, false);
        });

        it(
          'C422152 Auto-linking fields when multiple "MARC Authority" records match "$0" but cannot be linked when creating new "MARC Bib" record (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C422152'] },
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

            // Step 5: Add a linkable field "100"
            // Step 6: Replace "$a" in fourth box of added linkable field with "$0" value matching "naturalId"
            MarcAuthority.addNewField(
              4,
              testData.tags.tag100,
              testData.fieldContents.tag100Content,
              '1',
              '\\',
            );

            // Step 7: Click on the "Link headings" button placed in the upper right corner of pane header
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldNotLinked(
              5,
              testData.tags.tag100,
              '1',
              '\\',
              testData.fieldContents.tag100Content,
            );
            QuickMarcEditor.checkCallout(testData.errorMessage);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 8: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.url().then((url) => {
              createdInstanceId = url.split('/')[5].split('?')[0];
            });

            // Step 9: Click on the "Actions" in the third pane → Select "View source"
            InventoryInstance.viewSource();
            for (let i = 4; i < 7; i++) {
              InventoryViewSource.verifyLinkedToAuthorityIcon(i, false);
            }
            InventoryViewSource.contains('test');
            InventoryViewSource.contains('n99036055');
          },
        );
      });
    });
  });
});
