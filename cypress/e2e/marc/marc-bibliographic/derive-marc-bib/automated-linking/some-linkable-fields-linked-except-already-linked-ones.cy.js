import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
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
            marc: 'C388643MarcBib.mrc',
            fileName: `C388643 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388643MarcAuth.mrc',
            fileName: `C388643 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
            propertyName: 'authority',
          },
        ];

        const preLinkedFields = [
          {
            rowIndex: 82,
            value: 'C388643 Lee, Stan, 1922-2018',
            tag: 700,
            boxFourth: '$a C388643 Lee, Stan, $d 1922-2018',
            boxFifth: '$e creator.',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n83169267',
            boxSeventh: '',
          },
          {
            rowIndex: 85,
            value: 'C388643 Delaware Symposium on Language Studies',
            tag: 711,
            boxFourth:
              '$a C388643 Delaware Symposium on Language Studies. $t Delaware symposia on language studies $f 1985',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84745425',
            boxSeventh: '',
          },
          {
            rowIndex: 86,
            value: 'C388643 Gone with the wind (Motion picture : 1939)',
            tag: 730,
            boxFourth: '$a C388643 Gone with the wind $g (Motion picture : $f 1939)',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n79066095',
            boxSeventh: '',
          },
        ];

        const successfullyLinkedFields = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084',
          },
          {
            rowIndex: 33,
            tag: '240',
            naturalId: 'no2020024230',
          },
          {
            rowIndex: 61,
            tag: '600',
            naturalId: 'n2016004081',
          },
          {
            rowIndex: 58,
            tag: '630',
            naturalId: 'no2023006889',
          },
          {
            rowIndex: 69,
            tag: '655',
            naturalId: 'gf2014026266',
          },
          {
            rowIndex: 84,
            tag: '710',
            naturalId: 'no2008081921',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n79023811',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no2018018754',
          },
        ];

        const failedToLinkFields = [
          {
            rowIndex: 56,
            tag: '610',
            naturalId: 'nb20090244889',
          },
          {
            rowIndex: 57,
            tag: '611',
            naturalId: 'n822167579',
          },
          {
            rowIndex: 63,
            tag: '650',
            naturalId: 'sh20091259899',
          },
          {
            rowIndex: 67,
            tag: '651',
            naturalId: 'sh850015319',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n800955859',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no20181255879',
          },
        ];

        const createdRecordsIDs = [];

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388643*');
          InventoryInstances.deleteInstanceByTitleViaApi('C388643*');
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

              linkableFields.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, true);
              });

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
          'C388643 Some of linkable fields are linked (and some are not) after clicking on the "Link headings" button when derive "MARC bib", except already linked fields (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388643'] },
          () => {
            // Step 1: Find and open detail view of MARC Bib record
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();

            // Step 2: Derive new MARC bib record and keep linking
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.clickKeepLinkingButton();

            // Verify fields with $0 are present
            successfullyLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                field.rowIndex,
                field.tag,
                `$0 ${field.naturalId}`,
                `records[${field.rowIndex}].content`,
              );
            });

            failedToLinkFields.forEach((field) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                field.rowIndex,
                field.tag,
                `$0 ${field.naturalId}`,
                `records[${field.rowIndex}].content`,
              );
            });

            // Verify pre-linked fields are still linked
            preLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                '1',
                '\\',
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });

            // Verify "Link headings" button is enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" button (first time)
            QuickMarcEditor.clickLinkHeadingsButton();

            // Verify success toast notification
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 600, 630, 655, 710, 800, and 830 has been linked to MARC authority record(s).',
            );

            // Verify error toast notification
            QuickMarcEditor.checkCallout(
              'Field 610, 611, 650, 651, 810, and 811 must be set manually by selecting the link icon.',
            );

            // Verify successfully linked fields have unlink/view authority buttons
            successfullyLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(field.rowIndex);
            });

            // Verify pre-linked fields unchanged
            preLinkedFields.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                '1',
                '\\',
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });

            // Verify "Link headings" button still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 4: Click "Link headings" button again
            QuickMarcEditor.clickLinkHeadingsButton();

            // Verify only error notification (no success message)
            QuickMarcEditor.checkCallout(
              'Field 610, 611, 650, 651, 810, and 811 must be set manually by selecting the link icon.',
            );

            // Verify button still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 5: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 6: Browse subjects to verify auto-linked field 600
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.selectBrowseSubjects();
            BrowseSubjects.waitForSubjectToAppear(
              'C388643 Black Panther (Fictitious character)',
              true,
              true,
            );
            InventorySearchAndFilter.browseSearch('C388643 Black Panther (Fictitious character)');

            // Step 7: Click on highlighted subject
            InventorySearchAndFilter.selectFoundItemFromBrowse(
              'C388643 Black Panther (Fictitious character)',
            );

            // Step 8: View source and verify authority icons
            InventoryInstance.viewSource();

            // Verify pre-linked fields show authority icon
            preLinkedFields.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });

            // Verify auto-linked fields show authority icon
            successfullyLinkedFields.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });
          },
        );
      });
    });
  });
});
