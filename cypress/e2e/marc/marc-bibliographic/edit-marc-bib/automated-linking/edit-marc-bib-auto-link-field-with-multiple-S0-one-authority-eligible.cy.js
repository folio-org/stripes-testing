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
            marc: 'C389492MarcBib.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C389492MarcAuth1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389492MarcAuth2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C389492MarcAuth3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const testData = {
          searchQuery: 'C389492 On the road',
          successCallout: 'Field 100 has been linked to MARC authority record(s).',
          authorityHeading: 'C389492 Jackson, Peter,',
        };

        before('Create test data', () => {
          cy.getAdminToken();
          // Delete any existing test data before creating new records
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389492*');
          InventoryInstances.deleteInstanceByTitleViaApi('C389492*');

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
          'C389492 Auto-linking fields with multiple "$0" when only one "MARC Authority" record can be linked when editing "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389492'] },
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

            // Verify field 100 was linked successfully
            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            // Verify field 100 has been linked (checking for link/unlink buttons)
            // Controlled subfields from authority + uncontrolled $e from original bib
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              '100',
              '1',
              '\\',
              `$a ${testData.authorityHeading} $d 1950-2022 $c Inspector Banks series ;`,
              '$e author.',
              '$0 3052328889',
              '',
            );

            // Step 4: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 5: View source
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('100', true);
          },
        );
      });
    });
  });
});
