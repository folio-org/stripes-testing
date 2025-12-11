/* eslint-disable camelcase */
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
          tag245: '245',
          tag008: '008',
          tagLDR: 'LDR',
          tag700: '700',
          tag799: '799',
          instanceTitle: `AT_C566547_MarcBibInstance_${getRandomPostfix()}`,

          // Authority record data
          authorityRecord: {
            fileName: 'C566547MarcAuth.mrc',
            heading: 'AT_C566547_Elizabeth II, Queen of Great Britain, 1926-',
            searchValue: 'AT_C566547_Elizabeth',
            tag010Value: 'n80126296',
          },

          // Field 700 - First (to be linked)
          field700_1: {
            tag: '700',
            ind1: '$',
            ind2: '4',
            initialContent: '$a test $0 n80126296 $u sub1 $u sub2',
          },

          // Field 799 - Undefined 7XX field
          field799: {
            tag: '799',
            ind1: '1',
            ind2: '&',
            content: '$a Undefined 7XX field',
          },

          // Field 700 - Second repeatable field
          field700_2: {
            tag: '700',
            ind1: '4',
            ind2: '&',
            content: '$a Second 700 field',
          },

          // Invalid tag field
          invalidTagField: {
            tag: '70',
            ind1: '\\',
            ind2: '3',
            content: '$a Not valid tag',
          },

          // Helper function for field names
          fieldName: {
            fifthBox: (rowIndex) => `records[${rowIndex}].subfieldGroups.uncontrolledAlpha`,
            seventhBox: (rowIndex) => `records[${rowIndex}].subfieldGroups.uncontrolledNumber`,
          },

          successMessage:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const requiredPermissions = [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ];

        let user;
        let bibSpecId;
        let field700Id;
        let subfieldEId;
        let subfieldQId;
        let originalSubfieldERequired;
        let originalSubfieldQRequired;
        let createdAuthorityId;
        let field700RowIndex;

        before('Create test data', () => {
          cy.getAdminToken();

          // Clean up any existing authority records that start with AT_C566547
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C566547*');

          // Import MARC authority record from fixtures
          DataImport.uploadFileViaApi(
            testData.authorityRecord.fileName,
            `testMarcFileC566547_${getRandomPostfix()}.mrc`,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          ).then((response) => {
            createdAuthorityId = response[0].authority.id;
          });

          // Get bibliographic specification and update validation rules
          cy.getSpecificationIds()
            .then((specs) => {
              const bibSpec = specs.find((s) => s.profile === 'bibliographic');
              bibSpecId = bibSpec.id;
              return cy.getSpecificationFields(bibSpecId);
            })
            .then((fieldsResponse) => {
              const field700 = fieldsResponse.body.fields.find((f) => f.tag === '700');
              if (field700) {
                field700Id = field700.id;
                return cy.getSpecificationFieldSubfields(field700Id);
              }
              return null;
            })
            .then((subfieldsResponse) => {
              const subfieldE = subfieldsResponse.body.subfields.find((s) => s.code === 'e');
              const subfieldQ = subfieldsResponse.body.subfields.find((s) => s.code === 'q');

              if (subfieldE) {
                originalSubfieldERequired = subfieldE.required;
                subfieldEId = subfieldE.id;
                cy.updateSpecificationSubfield(subfieldEId, {
                  ...subfieldE,
                  required: true,
                });
              }
              if (subfieldQ) {
                originalSubfieldQRequired = subfieldQ.required;
                subfieldQId = subfieldQ.id;
                cy.updateSpecificationSubfield(subfieldQId, {
                  ...subfieldQ,
                  required: true,
                });
              }
            });

          // Create test user
          cy.createTempUser(requiredPermissions).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data and restore validation rules', () => {
          cy.getAdminToken();

          // Restore validation rules to original state
          if (subfieldEId && originalSubfieldERequired !== undefined && field700Id) {
            cy.getSpecificationFieldSubfields(field700Id, false).then((subfieldsResp) => {
              if (subfieldsResp.status === 200) {
                const subfieldE = subfieldsResp.body.subfields.find((s) => s.id === subfieldEId);
                if (subfieldE) {
                  cy.updateSpecificationSubfield(
                    subfieldEId,
                    {
                      ...subfieldE,
                      required: originalSubfieldERequired,
                    },
                    false,
                  );
                }
              }
            });
          }

          if (subfieldQId && originalSubfieldQRequired !== undefined && field700Id) {
            cy.getSpecificationFieldSubfields(field700Id, false).then((subfieldsResp) => {
              if (subfieldsResp.status === 200) {
                const subfieldQ = subfieldsResp.body.subfields.find((s) => s.id === subfieldQId);
                if (subfieldQ) {
                  cy.updateSpecificationSubfield(
                    subfieldQId,
                    {
                      ...subfieldQ,
                      required: originalSubfieldQRequired,
                    },
                    false,
                  );
                }
              }
            });
          }

          // Delete authority record
          if (createdAuthorityId) {
            MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          }

          // Delete user
          Users.deleteViaApi(user.userId);
        });

        it(
          'C566547 Trigger validation errors for linked field on "Create a new MARC bib record" pane (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C566547', 'nonParallel'] },
          () => {
            // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);

            // Step 2: Select valid values in LDR positions 06, 07
            QuickMarcEditor.updateLDR06And07Positions();
            let rowIndex = 4; // After LDR(0), 001(1), 005(2), 008(3)

            QuickMarcEditor.addEmptyFields(rowIndex);
            cy.wait(500);
            QuickMarcEditor.addValuesToExistingField(
              rowIndex,
              testData.field700_1.tag,
              testData.field700_1.initialContent,
              testData.field700_1.ind1,
              testData.field700_1.ind2,
            );
            field700RowIndex = ++rowIndex;

            // Step 5: Link added "700" field with imported MARC authority record
            QuickMarcEditor.clickLinkIconInTagField(field700RowIndex);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter('Keyword', testData.authorityRecord.searchValue);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.field700_1.tag,
              field700RowIndex,
            );

            // Step 6: Add subfields to the not controlled (editable) subfields box
            QuickMarcEditor.fillEmptyTextAreaOfField(
              field700RowIndex,
              testData.fieldName.fifthBox(field700RowIndex),
              '$a controlled subfield $v undefined subfield',
            );

            // Add: $9 subfield 9 to the seventh box (uncontrolledNumber)
            QuickMarcEditor.fillEmptyTextAreaOfField(
              field700RowIndex,
              testData.fieldName.seventhBox(field700RowIndex),
              '$9 subfield 9',
            );

            // Step 7: Add undefined "799" field
            QuickMarcEditor.addEmptyFields(field700RowIndex);
            QuickMarcEditor.addValuesToExistingField(
              field700RowIndex,
              testData.field799.tag,
              testData.field799.content,
              testData.field799.ind1,
              testData.field799.ind2,
            );
            const field799RowIndex = field700RowIndex + 1;

            // Step 8: Add second repeatable "700" field
            QuickMarcEditor.addEmptyFields(field799RowIndex);
            QuickMarcEditor.addValuesToExistingField(
              field799RowIndex,
              testData.field700_2.tag,
              testData.field700_2.content,
              testData.field700_2.ind1,
              testData.field700_2.ind2,
            );
            const field700_2RowIndex = field799RowIndex + 1;

            // Step 9: Add field with invalid MARC tag
            QuickMarcEditor.addEmptyFields(field700_2RowIndex);
            QuickMarcEditor.addValuesToExistingField(
              field700_2RowIndex,
              testData.invalidTagField.tag,
              testData.invalidTagField.content,
              testData.invalidTagField.ind1,
              testData.invalidTagField.ind2,
            );
            const invalidTagRowIndex = field700_2RowIndex + 1;

            // Step 10: Click "Save & close" and verify validation errors
            cy.wait(1000);
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(2000);

            // Verify validation summary callout: 5 warnings, 13 failures
            QuickMarcEditor.verifyValidationCallout(0, 12);

            // Verify inline errors for linked 700 field
            QuickMarcEditor.checkErrorMessage(
              field700RowIndex,
              '$9 is an invalid subfield for linkable bibliographic fields',
            );
            QuickMarcEditor.checkErrorMessage(
              field700RowIndex,
              'A subfield(s) cannot be updated because it is controlled by an authority heading',
            );
            QuickMarcEditor.checkErrorMessage(
              field700RowIndex,
              "Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'",
            );
            QuickMarcEditor.checkErrorMessage(field700RowIndex, "Subfield 'a' is non-repeatable");
            QuickMarcEditor.checkErrorMessage(field700RowIndex, "Subfield 'e' is required");
            QuickMarcEditor.checkErrorMessage(field700RowIndex, "Subfield 'q' is required");
            QuickMarcEditor.checkErrorMessage(field700RowIndex, "Subfield '9' is non-repeatable");

            // Verify errors for second 700 field
            QuickMarcEditor.checkErrorMessage(
              field700_2RowIndex,
              "Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'",
            );
            QuickMarcEditor.checkErrorMessage(field700_2RowIndex, "Subfield 'e' is required");
            QuickMarcEditor.checkErrorMessage(field700_2RowIndex, "Subfield 'q' is required");

            // Verify errors for invalid tag field
            QuickMarcEditor.checkErrorMessage(
              invalidTagRowIndex,
              'Tag must contain three characters and can only accept numbers 0-9',
            );

            // Verify toast notification about 245 field
            QuickMarcEditor.checkCallout('Field 245 is required.');
          },
        );
      });
    });
  });
});
