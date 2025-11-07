import uuid from 'uuid';
import { Permissions } from '../../../../../support/dictionary';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const uuidValue = uuid();
        const testData = {
          user: {},
          tags: {
            tag008: '008',
            tag040: '040',
            tag100: '100',
            tag245: '245',
            tag337: '337',
            tag700: '700',
          },
          fieldIndexes: {
            tag040: 4,
            tag100: 5,
            tag337: 7,
            tag700: 8,
          },
          authorityHeading: `AT_C387513_MarcAuthority_${randomPostfix}`,
          bibTitle: `AT_C387513_MarcBibInstance_${randomPostfix}`,
          tag100ContentBeforeLinking: '$a C387513 Contributor 1',
          values: {
            invalidUuidS9: '$9 test',
            validUuidS9: `$9 ${uuidValue}`,
            invalidAndValidSubfields: `$9 test $9 ${uuidValue}`,
            twoInvalidS9: '$9 test $9 TEST',
          },
          messages: {
            fieldLinked: 'Field 100 has been linked to a MARC authority record.',
            failInvalidSubfield:
              'Fail: $9 is an invalid subfield for linkable bibliographic fields.',
            failNonRepeatable: "Fail: Subfield '9' is non-repeatable.",
            subfieldUndefined: "Warn: Subfield '9' is undefined.",
            saveSuccess: 'Record updated',
          },
          authorityIconText: 'Linked to MARC authority',
        };

        const initialBibFieldContents = {
          tag040: '$a COO $b eng $e rda $c COO $d UOK',
          tag245: `$a ${testData.bibTitle}`,
          tag337: '$a unmediated $2 rdamedia $0 http://id.loc.gov/vocabulary/mediaTypes/n',
          tag700: '$a C387513 Woodson, Jacqueline,',
        };

        const updatedBibFieldContents = {
          tag040First: `${initialBibFieldContents.tag040} $9 test`,
          tag040Second: `${initialBibFieldContents.tag040} $9 testing`,
          tag337First: `${initialBibFieldContents.tag337} $9 test $9 TEST`,
          tag337Second: `${initialBibFieldContents.tag337} $9 more testing $9 MORE TESTING`,
          tag700First: `${initialBibFieldContents.tag700} $9 test`,
          tag700Second: `${initialBibFieldContents.tag700} $9 ${uuidValue}`,
          tag700Third: `${initialBibFieldContents.tag700} $9 test $9 ${uuidValue}`,
          tag100FifthBox: '$9 test',
          tag100SeventhBox: `$9 ${uuidValue}`,
        };

        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tags.tag040,
            content: initialBibFieldContents.tag040,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tags.tag100,
            content: testData.tag100ContentBeforeLinking,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag245,
            content: initialBibFieldContents.tag245,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tags.tag337,
            content: initialBibFieldContents.tag337,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tags.tag700,
            content: initialBibFieldContents.tag700,
            indicators: ['1', '\\'],
          },
        ];

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const authorityFields = [
          {
            tag: testData.tags.tag100,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag100,
          ind1: '1',
          ind2: '\\',
          controlledLetterSubfields: `$a ${testData.authorityHeading}`,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '',
        };

        let createdAuthorityId;
        let createdInstanceId;

        before('Create user and test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C387513_MarcAuthority');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

            cy.then(() => {
              // Create MARC authority record
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityId = createdRecordId;
              });

              // Create MARC bibliographic record
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            }).then(() => {
              // Link the authority and bib records using the linkMarcRecordsViaApi method
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: [createdAuthorityId],
                bibFieldTags: [testData.tags.tag100],
                authorityFieldTags: [testData.tags.tag100],
                finalBibFieldContents: [`$a ${testData.authorityHeading}`],
              });

              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);

              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(createdAuthorityId, true);
        });

        it(
          'C387513 Subfield "$9" presence validation when editing "MARC Bibliographic" record. (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C387513'] },
          () => {
            // Step 1: Open Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateLDR06And07Positions();

            // Verify one field is controlled by MARC Authority record (100)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            // Step 2: Add subfield "$9" with invalid UUID format in field eligible for linking (700)
            QuickMarcEditor.updateExistingField(
              testData.tags.tag700,
              updatedBibFieldContents.tag700First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag700,
              updatedBibFieldContents.tag700First,
            );
            QuickMarcEditor.checkButtonSaveAndCloseEnable();

            // Step 3: Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag700,
              testData.messages.failInvalidSubfield,
            );
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Step 5: Add subfield "$9" with valid UUID format in field eligible for linking (700)
            QuickMarcEditor.updateExistingField(
              testData.tags.tag700,
              updatedBibFieldContents.tag700Second,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag700,
              updatedBibFieldContents.tag700Second,
            );
            QuickMarcEditor.checkButtonSaveAndCloseEnable();

            // Step 6: Click "Save & keep editing" button
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag700,
              testData.messages.failInvalidSubfield,
            );
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Step 8: Add two subfields "$9" in field eligible for linking (700)
            QuickMarcEditor.updateExistingField(
              testData.tags.tag700,
              updatedBibFieldContents.tag700Third,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag700,
              updatedBibFieldContents.tag700Third,
            );
            QuickMarcEditor.checkButtonSaveAndCloseEnable();

            // Step 9: Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag700,
              testData.messages.failInvalidSubfield,
            );
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag700,
              testData.messages.failNonRepeatable,
            );
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.updateExistingField(
              testData.tags.tag700,
              initialBibFieldContents.tag700,
            );
            QuickMarcEditor.checkContentByTag(testData.tags.tag700, initialBibFieldContents.tag700);

            // Step 11: Add subfield "$9" with invalid UUID format in linked field (100) - fifth box
            QuickMarcEditor.fillLinkedFieldBox(
              testData.fieldIndexes.tag100,
              5,
              updatedBibFieldContents.tag100FifthBox,
            );
            QuickMarcEditor.checkButtonSaveAndCloseEnable();

            // Step 12: Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag100,
              testData.messages.failInvalidSubfield,
            );
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag100,
              testData.messages.failNonRepeatable,
            );
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Step 13: Delete changes made in step 11
            QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag100, 5, '');

            // Step 14: Add subfield "$9" with valid UUID format in linked field (100) - seventh box
            QuickMarcEditor.fillLinkedFieldBox(
              testData.fieldIndexes.tag100,
              7,
              updatedBibFieldContents.tag100SeventhBox,
            );

            // Step 15: Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag100,
              testData.messages.failInvalidSubfield,
            );
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag100,
              testData.messages.failNonRepeatable,
            );
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Step 16: Delete changes made in step 14
            QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag100, 7, '');

            // Step 17: Add subfield "$9" with invalid UUID format in non-linkable field (040)
            QuickMarcEditor.updateExistingField(
              testData.tags.tag040,
              updatedBibFieldContents.tag040First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag040,
              updatedBibFieldContents.tag040First,
            );
            QuickMarcEditor.checkButtonSaveAndCloseEnable();

            // Step 18: Add two subfields "$9" in non-linkable field (337)
            QuickMarcEditor.updateExistingField(
              testData.tags.tag337,
              updatedBibFieldContents.tag337First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag337,
              updatedBibFieldContents.tag337First,
            );

            // Step 19: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag040,
              testData.messages.subfieldUndefined,
            );
            QuickMarcEditor.checkErrorMessage(
              testData.fieldIndexes.tag337,
              testData.messages.subfieldUndefined,
            );

            // Step 20: Click "Save & close" button again
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            QuickMarcEditor.closeAllCallouts();

            // Step 21: Edit MARC bibliographic record again
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify only one field is linked (100)
            QuickMarcEditor.verifyRowLinked(testData.fieldIndexes.tag100, true);
            QuickMarcEditor.verifyRowLinked(testData.fieldIndexes.tag700, false);

            // Verify fields have "$9" subfields
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag040,
              updatedBibFieldContents.tag040First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag337,
              updatedBibFieldContents.tag337First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag040,
              updatedBibFieldContents.tag040First,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag337,
              updatedBibFieldContents.tag337First,
            );

            // Step 22: Edit "$9" subfields in all non-linkable fields
            QuickMarcEditor.updateExistingField(
              testData.tags.tag040,
              updatedBibFieldContents.tag040Second,
            );
            QuickMarcEditor.updateExistingField(
              testData.tags.tag337,
              updatedBibFieldContents.tag337Second,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag040,
              updatedBibFieldContents.tag040Second,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tags.tag337,
              updatedBibFieldContents.tag337Second,
            );

            // Step 23: Click "Save & close" button two times (ignore warn errors)
            QuickMarcEditor.saveAndCloseWithValidationWarnings();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 24: View source
            InventoryInstance.viewSource();
            InventoryViewSource.waitLoading();

            // Verify only one field has MARC authority icon (100)
            InventoryViewSource.contains(
              `${testData.authorityIconText}\n\t${testData.tags.tag100}`,
            );
            InventoryViewSource.notContains(
              `${testData.authorityIconText}\n\t${testData.tags.tag700}`,
            );

            // Verify 3 fields have "$9" subfields
            InventoryViewSource.contains(
              `\t${testData.tags.tag100}\t1  \t$a ${testData.authorityHeading} $0 ${authData.prefix}${authData.startWithNumber} $9`,
            );
            InventoryViewSource.contains(
              `\t${testData.tags.tag040}\t   \t${updatedBibFieldContents.tag040Second}`,
            );
            InventoryViewSource.contains(
              `\t${testData.tags.tag337}\t   \t${updatedBibFieldContents.tag337Second}`,
            );
          },
        );
      });
    });
  });
});
