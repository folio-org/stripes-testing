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
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const createdRecordIDs = [];

        const marcFiles = [
          {
            marc: 'C389494MarcBib.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C389494MarcAuth1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389494MarcAuth2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389494MarcAuth3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389494MarcAuth4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const testData = {
          searchQuery: 'C389494 On the road',
          errorCallout: 'Field 100, 650, and 830 must be set manually by selecting the link icon.',
          updated245Content: '$a C389494 On the road updated',
        };

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389494*');
          InventoryInstances.deleteInstanceByTitleViaApi('C389494*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id, true);
            });
          });
        });

        it(
          'C389494 Auto-linking fields with multiple "$0" when none of the "MARC Authority" records can be linked when editing "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389494'] },
          () => {
            // Step 1: Find and open detail view
            InventoryInstances.searchByTitle(testData.searchQuery);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            // Step 2: Click Actions → Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(2000);

            // Verify none of the fields were linked
            QuickMarcEditor.checkCallout(testData.errorCallout);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Verify field 100 remains unlinked
            QuickMarcEditor.verifyTagFieldNotLinked(
              15,
              '100',
              '1',
              '\\',
              '$a Kerouac, Jack, $d 1922-1969, $e author. $0 n79041362 $0 n93094742 $0 n79084169',
            );

            // Verify field 650 remains unlinked
            QuickMarcEditor.verifyTagFieldNotLinked(
              31,
              '650',
              '\\',
              '0',
              '$a Beats (Persons) $v Fiction. $0 y055055 $0 y044044 $0 y033033',
            );

            // Verify field 830 remains unlinked
            QuickMarcEditor.verifyTagFieldNotLinked(
              36,
              '830',
              '\\',
              '\\',
              '$a Value830 $0 y088088 $0 gf2014026297 $0 y099099',
            );

            // Step 4: Update value in 245 field
            QuickMarcEditor.updateExistingField('245', testData.updated245Content);

            // Step 5: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 6: View source
            InventoryInstance.viewSource();

            // Verify NO MARC authority app icon is displayed next to any field
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('100', false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('650', false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('830', false);

            // Verify updates made at Step 4 are applied
            InventoryViewSource.contains('C389494 On the road updated');
          },
        );
      });
    });
  });
});
