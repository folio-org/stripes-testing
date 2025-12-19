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
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
            tag600: '600',
          },
          fieldContents: {
            tag245Content: 'Empty subfield codes test',
          },
          linked600Field: {
            tag: '600',
            rowIndex: 5,
            ind1: '1',
            ind2: '\\',
            content: '$a Carter, Ruth E., $d 1960-  $0 no92026494',
            searchOption: 'Personal name',
            searchValue: 'AT_C877109_Carter, Ruth E',
            boxFourth: '$a AT_C877109_Carter, Ruth E., $d 1960-',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/no92026494',
            boxSeventh: '',
          },
          emptySubfields: {
            fifthBox: '$w',
            seventhBox: '$2 ',
          },
          fieldNames: {
            fifthBox: 'records[5].subfieldGroups.uncontrolledAlpha',
            seventhBox: 'records[5].subfieldGroups.uncontrolledNumber',
          },
        };

        const marcFiles = [
          {
            marc: 'C877109MarcAuth.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const createdAuthorityIDs = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C877109*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.moduleDataImportEnabled.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

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

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          if (createdInstanceId) {
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          }
        });

        it(
          'C877109 Verify that MARC bib record could be successfully created with empty subfield code in linked field (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C877109'] },
          () => {
            // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record" option
            InventoryInstances.createNewMarcBibRecord();
            QuickMarcEditor.waitLoading();

            // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 3: Valid 008 field values are automatically set (no red highlighting)
            // This is handled automatically by updateLDR06And07Positions()

            // Step 4: Fill in the "245" field
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );

            // Step 5: Add "600" field
            MarcAuthority.addNewField(
              4,
              testData.linked600Field.tag,
              testData.linked600Field.content,
              testData.linked600Field.ind1,
              testData.linked600Field.ind2,
            );
            QuickMarcEditor.checkLinkButtonExistByRowIndex(testData.linked600Field.rowIndex);

            // Step 6: Link "600" field with imported "MARC authority" record
            QuickMarcEditor.clickLinkIconInTagField(testData.linked600Field.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.searchByParameter(
              testData.linked600Field.searchOption,
              testData.linked600Field.searchValue,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.linked600Field.rowIndex);

            // Verify the linked field structure with 7 boxes
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.linked600Field.rowIndex,
              testData.linked600Field.tag,
              testData.linked600Field.ind1,
              testData.linked600Field.ind2,
              testData.linked600Field.boxFourth,
              testData.linked600Field.boxFifth,
              testData.linked600Field.boxSixth,
              testData.linked600Field.boxSeventh,
            );

            // Step 7: Add empty subfield codes to editable boxes
            QuickMarcEditor.fillEmptyTextAreaOfField(
              testData.linked600Field.rowIndex,
              testData.fieldNames.fifthBox,
              testData.emptySubfields.fifthBox,
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              testData.linked600Field.rowIndex,
              testData.fieldNames.seventhBox,
              testData.emptySubfields.seventhBox,
            );

            // Step 8: Click on the "Save & keep editing" button
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            // Verify empty subfields are automatically removed
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.linked600Field.rowIndex,
              testData.linked600Field.tag,
              testData.linked600Field.ind1,
              testData.linked600Field.ind2,
              testData.linked600Field.boxFourth,
              testData.linked600Field.boxFifth,
              testData.linked600Field.boxSixth,
              testData.linked600Field.boxSeventh,
            );

            // Capture instance ID for cleanup
            cy.url().then((url) => {
              createdInstanceId = url.split('/')[5].split('?')[0];
            });

            // Step 9: Close "quickmarc" pane
            QuickMarcEditor.closeEditorPane();
            InventoryInstance.waitLoading();

            // Step 10: Click on "Actions" >> "View source"
            InventoryInstance.viewSource();

            // Verify empty subfields don't display in the linked field
            InventoryViewSource.contains(testData.linked600Field.boxFourth);
            InventoryViewSource.contains(testData.linked600Field.boxSixth);
            InventoryViewSource.notContains(testData.emptySubfields.fifthBox);
            InventoryViewSource.notContains(testData.emptySubfields.seventhBox);
          },
        );
      });
    });
  });
});
