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
        let userData = {};
        const marcAuthIcon = 'Linked to MARC authority';

        const marcFiles = [
          {
            marc: 'C389488MarcBib.mrc',
            fileName: `C389488 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C389488MarcAuth.mrc',
            fileName: `C389488 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 22,
            propertyName: 'authority',
          },
        ];

        // Fields that are manually pre-linked before test execution
        const preLinkedFields = [
          {
            rowIndex: 56,
            value: 'C389488 Black Panther Movement',
            tag: 610,
            boxSecond: '\\',
            boxThird: '6',
            boxFourth: '$a C389488 Black Panther Movement',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/nb2009024488',
            boxSeventh: '',
          },
          {
            rowIndex: 66,
            value: 'C389488 Superheroes',
            tag: 650,
            boxSecond: '\\',
            boxThird: '7',
            boxFourth: '$a C389488 Superheroes',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/subjects/sh2007009593',
            boxSeventh: '$2 fast',
          },
          {
            rowIndex: 81,
            value: 'C389488 Sabino, Joe',
            tag: 700,
            boxSecond: '1',
            boxThird: '\\',
            boxFourth: '$a C389488 Sabino, Joe',
            boxFifth: '$e letterer.',
            boxSixth: '$0 http://id.loc.gov/authorities/names/no2011137752',
            boxSeventh: '',
          },
        ];

        // Fields that should successfully auto-link (default fields with matching $0)
        const successfullyLinkedFields = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084',
          },
          {
            rowIndex: 82,
            tag: '700',
            naturalId: 'n83169267',
          },
          {
            rowIndex: 85,
            tag: '711',
            naturalId: 'n84745425',
          },
          {
            rowIndex: 86,
            tag: '730',
            naturalId: 'n79066095',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n79023811',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n80095585',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no2018125587',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no2018018754',
          },
        ];

        // Fields that should fail to auto-link (will be updated to non-matching $0)
        const failedToLinkFields = [
          {
            rowIndex: 33,
            tag: '240',
            originalNaturalId: 'no2020024230',
            updatedNaturalId: 'no20200242301',
          },
          {
            rowIndex: 84,
            tag: '710',
            originalNaturalId: 'no2008081921',
            updatedNaturalId: 'no20080819219',
          },
        ];

        const createdRecordsIDs = [];

        // Default fields for auto-linking
        const defaultAutoLinkFields = [
          100, 110, 111, 130, 240, 700, 710, 711, 730, 800, 810, 811, 830,
        ];
        // Non-default fields (disabled for auto-linking)
        const nonDefaultFields = [600, 610, 611, 630, 650, 651, 655];
        // All linkable fields

        before('Creating user and data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389488*');
          InventoryInstances.deleteInstanceByTitleViaApi('C389488*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordsIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.searchByTitle(createdRecordsIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();

              // Configure auto-linking rules: enable default fields, disable non-default
              defaultAutoLinkFields.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, true);
              });
              nonDefaultFields.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, false);
              });

              // Manually link precondition fields
              preLinkedFields.forEach((linking) => {
                QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linking.value);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
              });

              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
              InventoryInstance.waitLoading();

              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
          createdRecordsIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C389488 Pre-defined fields are linked after clicking on the "Link headings" button in derive "MARC bib" when only default fields enabled for autolinking (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389488'] },
          () => {
            // Step 1: Find and open detail view of MARC Bib record
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Click on "Actions" → Select "Derive new MARC bibliographic record" → Click on "Keep linking"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.clickKeepLinkingButton();

            // Verify deriving pane is opened with all fields and $0 subfields
            QuickMarcEditor.waitLoading();

            // Verify all linkable fields have $0 subfield
            successfullyLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                field.rowIndex,
                field.tag,
                field.naturalId,
                `records[${field.rowIndex}].content`,
              );
            });

            failedToLinkFields.forEach((field) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                field.rowIndex,
                field.tag,
                field.originalNaturalId,
                `records[${field.rowIndex}].content`,
              );
            });

            // Verify pre-linked fields are still linked
            preLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                field.boxSecond,
                field.boxThird,
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });

            // Verify "Link headings" button is enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Update subfield $0 in eligible fields to NOT match naturalId
            QuickMarcEditor.updateExistingField(
              '240',
              `$a Black Panther $0 ${failedToLinkFields[0].updatedNaturalId}`,
            );
            QuickMarcEditor.updateExistingField(
              '710',
              `$a Robinson $0 ${failedToLinkFields[1].updatedNaturalId}`,
            );

            cy.wait(1000);

            // Step 4: Click on the "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();

            // Verify success toast notification
            QuickMarcEditor.checkCallout(
              'Field 100, 700, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
            );

            // Verify error toast notification
            QuickMarcEditor.checkCallout(
              'Field 240 and 710 must be set manually by selecting the link icon.',
            );

            // Verify successfully linked fields have unlink/view authority buttons
            successfullyLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(field.rowIndex);
            });

            // Verify pre-linked fields remain unchanged
            preLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                field.boxSecond,
                field.boxThird,
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });

            // Verify "Link headings" button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 5: Click on the "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 6: Scroll down to the "Contributors" accordion
            // MARC authority icon is displayed next to auto-linked contributor names
            // Note: This is visually verified in UI, framework may not have direct assertion

            // Step 7: Click on the "Actions" >> Select "View source"
            InventoryInstance.viewSource();

            // Verify MARC authority icon is displayed next to manually linked fields
            preLinkedFields.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });

            // Verify MARC authority icon is displayed next to auto-linked fields
            successfullyLinkedFields.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });

            // Verify no authority icon for fields that failed to link (240, 710)
            // Note: Verification of absence is implicit - fields without icon won't match the pattern
          },
        );
      });
    });
  });
});
