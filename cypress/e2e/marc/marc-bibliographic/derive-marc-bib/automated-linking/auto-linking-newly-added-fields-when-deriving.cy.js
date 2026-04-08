import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
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
            authorityHeading: 'C388647 Runaway Bride (Motion picture)',
          },
          // Newly added fields (added after last bib row 53)
          newField240: {
            tag: '240',
            content: '$a Value240',
            rowIndex: 54,
          },
          newField610: {
            tag: '610',
            content: '$0 n93094742',
            rowIndex: 55,
          },
          newField650: {
            tag: '650',
            content: '$0 y133133',
            rowIndex: 56,
          },
          newField711: {
            tag: '711',
            content: '$j something $0 n85281584 $2 fast',
            rowIndex: 57,
            linkedBoxFourth:
              '$a C388647 Mediterranean Conference on Medical and Biological Engineering',
            linkedBoxFifth: '$j something',
            linkedBoxSixth: '$0 http://id.loc.gov/authorities/names/n85281584',
            linkedBoxSeventh: '$2 fast',
          },
          newField830: {
            tag: '830',
            content: '$a something $d 1900-2000 $0 no2011188426',
            rowIndex: 58,
            linkedBoxFourth: '$a C388647 Robinson eminent scholar lecture series',
            linkedBoxFifth: '',
            linkedBoxSixth: '$0 http://id.loc.gov/authorities/names/no2011188426',
            linkedBoxSeventh: '',
          },
          newField700: {
            tag: '700',
            content: '$a smth $0 0255869',
            rowIndex: 59,
          },
          successCallout: 'Field 610, 711, and 830 has been linked to MARC authority record(s).',
          errorCallout: 'Field 650 must be set manually by selecting the link icon.',
          authoritySearchValue: 'C388647 Robinson eminent scholar lecture series',
        };

        const marcFiles = [
          {
            marc: 'C388647MarcBib.mrc',
            fileName: `C388647 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388647MarcAuth1.mrc',
            fileName: `C388647_Auth1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388647MarcAuth2.mrc',
            fileName: `C388647_Auth2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388647MarcAuth3.mrc',
            fileName: `C388647_Auth3 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388647MarcAuth4.mrc',
            fileName: `C388647_Auth4 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388647MarcAuth5.mrc',
            fileName: `C388647_Auth5 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [610, 700, 711, 830];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388647*');
          InventoryInstances.deleteInstanceByTitleViaApi('C388647*');

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
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
          'C388647 Auto-linking newly added fields when deriving new "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C388647'] },
          () => {
            // Step 1: Find and open detail view of imported record
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Derive new MARC bib record and keep linking
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.clickKeepLinkingButton();

            // Steps 3-4: Add 5 new fields
            MarcAuthority.addNewField(53, testData.newField240.tag, testData.newField240.content);
            cy.wait(500);
            MarcAuthority.addNewField(54, testData.newField610.tag, testData.newField610.content);
            cy.wait(500);
            MarcAuthority.addNewField(55, testData.newField650.tag, testData.newField650.content);
            cy.wait(500);
            MarcAuthority.addNewField(56, testData.newField711.tag, testData.newField711.content);
            cy.wait(500);
            MarcAuthority.addNewField(57, testData.newField830.tag, testData.newField830.content);
            cy.wait(500);

            // Step 5: Click "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);

            // Verify toast notifications
            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.checkCallout(testData.errorCallout);

            // Verify pre-linked field 130 remains linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex);

            // Verify newly auto-linked fields 610, 711, 830
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.newField610.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.newField711.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.newField830.rowIndex);

            // Verify field 650 is NOT linked (non-matching $0)
            QuickMarcEditor.verifyRowLinked(testData.newField650.rowIndex, false);

            // Verify 711 has non-controllable subfields ($j something, $2 fast) preserved
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.newField711.tag,
              '\\',
              '\\',
              testData.newField711.linkedBoxFourth,
              testData.newField711.linkedBoxFifth,
              testData.newField711.linkedBoxSixth,
              testData.newField711.linkedBoxSeventh,
            );

            // Verify 830 does NOT have controllable subfields ($a something, $d 1900-2000)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.newField830.tag,
              '\\',
              '\\',
              testData.newField830.linkedBoxFourth,
              testData.newField830.linkedBoxFifth,
              testData.newField830.linkedBoxSixth,
              testData.newField830.linkedBoxSeventh,
            );

            // Verify "Link headings" button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 6-7: Add field 700 with $a and $0 matching an existing authority
            MarcAuthority.addNewField(58, testData.newField700.tag, testData.newField700.content);
            cy.wait(500);

            // Step 8: Update field 650 $0 to a value matching an existing authority
            QuickMarcEditor.updateExistingFieldContent(
              testData.newField650.rowIndex,
              '$0 no2011188426',
            );

            // Step 9: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 10: View source and verify MARC authority icons on all linked fields
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('130', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('610', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('711', true);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag('830', true);

            // Step 11: Close source view
            InventoryViewSource.close();

            // Step 12: Open edit mode and verify linked fields and subfield content
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify pre-linked 130 is still linked
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex - 2);

            // Verify 711 retains non-controllable subfields ($j something, $2 fast)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.newField711.tag,
              '\\',
              '\\',
              testData.newField711.linkedBoxFourth,
              testData.newField711.linkedBoxFifth,
              testData.newField711.linkedBoxSixth,
              testData.newField711.linkedBoxSeventh,
            );

            // Verify 830 does NOT have controllable subfields ($a something, $d 1900-2000)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.newField830.tag,
              '\\',
              '\\',
              testData.newField830.linkedBoxFourth,
              testData.newField830.linkedBoxFifth,
              testData.newField830.linkedBoxSixth,
              testData.newField830.linkedBoxSeventh,
            );

            // Verify "Link headings" button is enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 13: Navigate to MARC authority app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();

            // Step 14: Search for the auto-linked series name from field 830
            MarcAuthoritiesSearch.searchBy('Keyword', testData.authoritySearchValue);
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.authoritySearchValue, 1);

            // Step 15: Click on "Number of titles" digit and verify redirect to Inventory
            MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(testData.authoritySearchValue, 1);
            InventoryInstance.waitInventoryLoading();
          },
        );
      });
    });
  });
});
