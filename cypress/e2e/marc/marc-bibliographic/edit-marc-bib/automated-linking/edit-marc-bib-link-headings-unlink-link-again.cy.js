import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData;
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const autoLinkedFields = [
          { rowIndex: 16, tag: '100', aSubfield: '$a Chin, Staceyann.', isUnlinked: true },
          { rowIndex: 27, tag: '600', aSubfield: '$a Chin, Staceyann.', isUnlinked: true },
          { rowIndex: 29, tag: '650', aSubfield: '$a Authors, Jamaican', isUnlinked: false },
          {
            rowIndex: 30,
            tag: '650',
            aSubfield: '$a C388515Lesbian authors',
            newContent: '$a C388515Lesbian authors $z Jamaica $v Biography. $0 sh96007532',
            isUnlinked: true,
          },
          {
            rowIndex: 31,
            tag: '650',
            aSubfield: '$a C388515Lesbian activists',
            newContent: '$a C388515Lesbian activists $z Jamaica $v Biography.',
            isUnlinked: true,
          },
        ];
        const manuallyUnlinkedFields = [
          { rowIndex: 16, tag: '100', aSubfield: '$a C388515Chin, Staceyann.' },
          { rowIndex: 27, tag: '600', aSubfield: '$a C388515Chin, Staceyann.' },
          {
            rowIndex: 30,
            tag: '650',
            aSubfield: '$a C388515Lesbian authors',
            newContent: '$a C388515Lesbian authors $z Jamaica $v Biography. $0 sh96007532',
          },
          {
            rowIndex: 31,
            tag: '650',
            aSubfield: '$a C388515Lesbian activists',
            newContent: '$a C388515Lesbian activists $z Jamaica $v Biography.',
          },
        ];
        const notLinkedFieldRow = 4;
        const createdRecordIDs = [];
        const naturalIds = [
          'no202105618',
          'n83169268',
          'sh99014708',
          'sh96007532',
          'n2008052405',
          'sh85009932',
        ];
        const authority = {
          searchOption: 'Identifier (all)',
          searchInput: 'n83169268',
        };
        const marcFiles = [
          {
            marc: 'marcBibFileForC388515.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388515-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388515-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388515-3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388515-4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388515-5.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388515-6.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Create test data', () => {
          // Making sure there are no duplicate authority records in the system before auto-linking
          cy.getAdminToken().then(() => {
            naturalIds.forEach((id) => {
              MarcAuthorities.getMarcAuthoritiesViaApi({
                limit: 200,
                query: `naturalId="${id}" and (authRefType=="Authorized")`,
              }).then((records) => {
                records.forEach((record) => {
                  MarcAuthority.deleteViaAPI(record.id, true);
                });
              });
            });
          });

          cy.getAdminToken();
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

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((field) => QuickMarcEditor.setRulesForField(field, true));

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id);
            });
          });
        });

        it(
          'C388515 Click on "Link headings" button when edit "MARC bib" >> unlink some fields >> click on "Link headings" button again (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388515'] },
          () => {
            // #1 Find and open detail view of "MARC Bib" record from precondition, ex. of search query:
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // #2 Click on "Actions" button in second pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #3 Click on the "Link headings" button.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 600, and 650 has been linked to MARC authority record(s).',
            );
            autoLinkedFields.forEach((field) => QuickMarcEditor.verifyRowLinked(field.rowIndex, true));
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            // #4 Unlink 4 automatically linked fields by clicking on "Unlink from MARC authority record" icon.
            manuallyUnlinkedFields.forEach((field) => {
              QuickMarcEditor.clickUnlinkIconInTagField(field.rowIndex);
              cy.wait(1000);
              QuickMarcEditor.confirmUnlinkingField();
              QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
            });
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #5 Link first unlinked field to different "MARC authority" record ("$0" value should be changed). For example: link 100 to "n83169268"
            QuickMarcEditor.clickLinkIconInTagField(manuallyUnlinkedFields[0].rowIndex);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResultsWithOption(
              authority.searchOption,
              authority.searchInput,
            );
            MarcAuthoritiesSearch.selectAuthorityByIndex(0);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              manuallyUnlinkedFields[0].rowIndex,
              manuallyUnlinkedFields[0].tag,
              '1',
              '\\',
              '$a C388515Lee, Stan, $d 1922-2018',
              '$e author.',
              '$0 http://id.loc.gov/authorities/names/n83169268',
              '',
            );
            // #6 Edit subfield "$0" value of unlinked field to another valid (matched with "naturalId" of existing "MARC authority" record)
            QuickMarcEditor.updateExistingFieldContent(
              manuallyUnlinkedFields[2].rowIndex,
              manuallyUnlinkedFields[2].newContent,
            );
            QuickMarcEditor.checkContent(
              manuallyUnlinkedFields[2].newContent,
              manuallyUnlinkedFields[2].rowIndex,
            );
            // #7 Delete subfield "$0" of unlinked field.
            QuickMarcEditor.updateExistingFieldContent(
              manuallyUnlinkedFields[3].rowIndex,
              manuallyUnlinkedFields[3].newContent,
            );
            QuickMarcEditor.checkContent(
              manuallyUnlinkedFields[3].newContent,
              manuallyUnlinkedFields[3].rowIndex,
            );
            // #8 Click on the "Link headings" button again.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 600 and 650 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.verifyRowLinked(manuallyUnlinkedFields[0].rowIndex, true);
            QuickMarcEditor.verifyRowLinked(manuallyUnlinkedFields[2].rowIndex, true);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            // #9 Click on the "Save & keep editing" button.
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(4000);
            QuickMarcEditor.clickSaveAndKeepEditing();
            autoLinkedFields.forEach((field, index) => {
              if (index !== notLinkedFieldRow) {
                QuickMarcEditor.verifyRowLinked(field.rowIndex, true);
              } else {
                QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
              }
            });
          },
        );
      });
    });
  });
});
