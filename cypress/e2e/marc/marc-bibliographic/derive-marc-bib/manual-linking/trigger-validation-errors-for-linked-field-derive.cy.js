import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../../support/api/specifications-helper';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(10);
        const randomDigits = `566563${randomNDigitNumber(5)}`;
        const sourceFilePrefix = randomLetters;
        const rowIndex700 = 5;

        const testData = {
          tag008: '008',
          tag010: '010',
          tag100: '100',
          tag245: '245',
          tag700: '700',
          tag799: '799',
          tag70: '70',
          tag246: '246',
          bibTitle: `AT_C566563_MarcBibInstance_${randomPostfix}`,
          authorityPrefix: sourceFilePrefix,
          authorityNaturalId: randomDigits,
          authorityField100Content: `$a AT_C566563_MarcAuthority_${randomPostfix} $d 1972-`,
          authorityHeading: `AT_C566563_MarcAuthority_${randomPostfix} 1972-`,
          bibField700OriginalContent: '$a AT_C566563_Field700 $d 1972-',
          bibField700ModifiedContent: '$a AT_C566563_Field700 $d 1972- $u sub1 $u sub2',
          bibField700LinkedControlled: `$a AT_C566563_MarcAuthority_${randomPostfix} $d 1972-`,
        };

        const field799Data = {
          rowIndex: rowIndex700 + 1,
          tag: testData.tag799,
          content: '$a Undefined 7XX field',
          indicator1: '1',
          indicator2: '\\',
        };

        const field700SecondData = {
          rowIndex: rowIndex700 + 2,
          tag: testData.tag700,
          content: '$a Second 700 field',
          indicator1: '4',
          indicator2: '&',
        };

        const field70Data = {
          rowIndex: rowIndex700 + 3,
          tag: testData.tag70,
          content: '$a Not valid tag',
          indicator1: '\\',
          indicator2: '3',
        };

        const validationMessages = {
          invalidSubfield9: 'Fail: $9 is an invalid subfield for linkable bibliographic fields.',
          controlledByAuthority:
            'Fail: A subfield(s) cannot be updated because it is controlled by an authority heading.',
          subfieldUNonRepeatable: "Fail: Subfield 'u' is non-repeatable.",
          subfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
          subfieldQRequired: "Fail: Subfield 'q' is required.",
          subfieldERequired: "Fail: Subfield 'e' is required.",
          subfieldVUndefined: "Warn: Subfield 'v' is undefined.",
          subfield9NonRepeatable: "Fail: Subfield '9' is non-repeatable.",
          fieldUndefined: 'Warn: Field is undefined.',
          indicatorInvalid:
            "Fail: Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'.",
          tagInvalid: 'Fail: Tag must contain three characters and can only accept numbers 0-9.',
          field245Required: 'Field 245 is required.',
          secondIndicatorUndefined: "Warn: Second Indicator '4' is undefined.",
          firstIndicatorUndefined: "Warn: First Indicator '4' is undefined.",
        };

        let userData;
        let bibSpecId;
        let field700Id;
        let subfieldEId;
        let subfieldQId;
        let subfieldEOriginalData;
        let subfieldQOriginalData;
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C566563_');

          cy.then(() => {
            // Get bib specification ID
            getBibliographicSpec().then((bibSpec) => {
              bibSpecId = bibSpec.id;
              cy.syncSpecifications(bibSpec.id);
            });
          })
            .then(() => {
              // Create MARC Authority
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.authorityPrefix,
                testData.authorityNaturalId,
                [
                  {
                    tag: testData.tag010,
                    content: `$a ${testData.authorityPrefix}${testData.authorityNaturalId}`,
                    indicators: ['\\', '\\'],
                  },
                  {
                    tag: testData.tag100,
                    content: testData.authorityField100Content,
                    indicators: ['1', '\\'],
                  },
                ],
              ).then((authorityId) => {
                createdAuthorityIds.push(authorityId);
                testData.authorityId = authorityId;
              });

              // Create MARC Bib (not pre-linked, no 700 field)
              const marcBibFields = [
                {
                  tag: testData.tag008,
                  content: QuickMarcEditor.valid008ValuesInstance,
                },
                {
                  tag: testData.tag245,
                  content: `$a ${testData.bibTitle}`,
                  indicators: ['1', '1'],
                },
              ];

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                },
              );
            })
            .then(() => {
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]).then((userProperties) => {
                userData = userProperties;
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();

          // Restore validation rules
          toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
          if (subfieldEId && subfieldEOriginalData) {
            cy.updateSpecificationSubfield(
              subfieldEId,
              { ...subfieldEOriginalData, required: false },
              false,
            );
          }
          if (subfieldQId && subfieldQOriginalData) {
            cy.updateSpecificationSubfield(
              subfieldQId,
              { ...subfieldQOriginalData, required: false },
              false,
            );
          }
          cy.syncSpecifications(bibSpecId);

          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C566563 Trigger validation errors for linked field on "Derive a new MARC bib record" pane (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C566563'] },
          () => {
            cy.then(() => {
              // Update validation rules to make $e and $q required in field 700
              cy.getAdminToken();
              cy.getSpecificationFields(bibSpecId).then((response) => {
                const field700 = findStandardField(response.body.fields, testData.tag700);
                if (field700) {
                  field700Id = field700.id;

                  cy.getSpecificationFieldSubfields(field700Id).then((subfieldResponse) => {
                    const subfieldE = findStandardSubfield(subfieldResponse.body.subfields, 'e');
                    const subfieldQ = findStandardSubfield(subfieldResponse.body.subfields, 'q');

                    if (subfieldE) {
                      subfieldEId = subfieldE.id;
                      subfieldEOriginalData = { ...subfieldE };

                      if (!subfieldE.required) {
                        cy.updateSpecificationSubfield(
                          subfieldEId,
                          {
                            ...subfieldE,
                            required: true,
                          },
                          false,
                        );
                      }
                    }

                    if (subfieldQ) {
                      subfieldQId = subfieldQ.id;
                      subfieldQOriginalData = { ...subfieldQ };

                      if (!subfieldQ.required) {
                        cy.updateSpecificationSubfield(
                          subfieldQId,
                          {
                            ...subfieldQ,
                            required: true,
                          },
                          false,
                        );
                      }
                    }
                  });
                }
              });
            }).then(() => {
              toggleAllUndefinedValidationRules(bibSpecId, { enable: true });

              // Login and navigate to inventory
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });

              // Step 1: Open "Derive a new MARC bib record" pane
              InventoryInstances.searchByTitle(createdInstanceIds[0]);
              InventoryInstances.selectInstanceById(createdInstanceIds[0]);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Add new 700 field with invalid indicators and $u subfields
              QuickMarcEditor.addEmptyFields(rowIndex700 - 1);
              QuickMarcEditor.checkEmptyFieldAdded(rowIndex700);
              QuickMarcEditor.addValuesToExistingField(
                rowIndex700 - 1,
                testData.tag700,
                testData.bibField700ModifiedContent,
                '$',
                '4',
              );
              QuickMarcEditor.verifyTagField(
                rowIndex700,
                testData.tag700,
                '$',
                '4',
                testData.bibField700ModifiedContent,
                '',
              );

              // Step 3: Link 700 field with MARC authority record
              QuickMarcEditor.clickLinkIconInTagField(rowIndex700);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(testData.authorityHeading);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, rowIndex700);

              // Step 4: Add controlled subfield, undefined subfield, and $9 to editable boxes
              QuickMarcEditor.fillLinkedFieldBox(
                rowIndex700,
                5,
                '$u sub1 $u sub2 $a controlled subfield $v undefined subfield',
              );
              QuickMarcEditor.fillLinkedFieldBox(rowIndex700, 7, '$9 subfield 9');
              QuickMarcEditor.verifyTagFieldAfterLinking(
                rowIndex700,
                testData.tag700,
                '$',
                '4',
                testData.bibField700LinkedControlled,
                '$u sub1 $u sub2 $a controlled subfield $v undefined subfield',
                `$0 ${testData.authorityPrefix}${testData.authorityNaturalId}`,
                '$9 subfield 9',
              );

              // Step 5: Add undefined 7XX field (799)
              QuickMarcEditor.addEmptyFields(field799Data.rowIndex - 1);
              QuickMarcEditor.checkEmptyFieldAdded(field799Data.rowIndex);
              QuickMarcEditor.addValuesToExistingField(
                field799Data.rowIndex - 1,
                field799Data.tag,
                field799Data.content,
                field799Data.indicator1,
                field799Data.indicator2,
              );
              QuickMarcEditor.verifyTagField(
                field799Data.rowIndex,
                field799Data.tag,
                field799Data.indicator1,
                field799Data.indicator2,
                field799Data.content,
                '',
              );

              // Step 6: Add second 700 field
              QuickMarcEditor.addEmptyFields(field700SecondData.rowIndex - 1);
              QuickMarcEditor.checkEmptyFieldAdded(field700SecondData.rowIndex);
              QuickMarcEditor.addValuesToExistingField(
                field700SecondData.rowIndex - 1,
                field700SecondData.tag,
                field700SecondData.content,
                field700SecondData.indicator1,
                field700SecondData.indicator2,
              );
              QuickMarcEditor.verifyTagField(
                field700SecondData.rowIndex,
                field700SecondData.tag,
                field700SecondData.indicator1,
                field700SecondData.indicator2,
                field700SecondData.content,
                '',
              );

              // Step 7: Add field with invalid MARC tag
              QuickMarcEditor.addEmptyFields(field70Data.rowIndex - 1);
              QuickMarcEditor.checkEmptyFieldAdded(field70Data.rowIndex);
              QuickMarcEditor.addValuesToExistingField(
                field70Data.rowIndex - 1,
                field70Data.tag,
                field70Data.content,
                field70Data.indicator1,
                field70Data.indicator2,
              );
              QuickMarcEditor.verifyTagField(
                field70Data.rowIndex,
                field70Data.tag,
                field70Data.indicator1,
                field70Data.indicator2,
                field70Data.content,
                '',
              );

              // Step 8: Remove 245 field
              QuickMarcEditor.updateExistingTagName(testData.tag245, testData.tag246);
              QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag246);
              QuickMarcEditor.afterDeleteNotification(testData.tag246);

              // Step 9: Click Save & close - verify all error messages
              QuickMarcEditor.pressSaveAndCloseButton();

              // Verify inline errors for linked 700 field
              QuickMarcEditor.checkErrorMessage(rowIndex700, validationMessages.invalidSubfield9);
              QuickMarcEditor.checkErrorMessage(
                rowIndex700,
                validationMessages.controlledByAuthority,
              );
              QuickMarcEditor.checkErrorMessage(rowIndex700, validationMessages.indicatorInvalid);
              QuickMarcEditor.checkErrorMessage(
                rowIndex700,
                validationMessages.secondIndicatorUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                rowIndex700,
                validationMessages.subfieldUNonRepeatable,
              );
              QuickMarcEditor.checkErrorMessage(
                rowIndex700,
                validationMessages.subfieldANonRepeatable,
              );
              QuickMarcEditor.checkErrorMessage(rowIndex700, validationMessages.subfieldQRequired);
              QuickMarcEditor.checkErrorMessage(rowIndex700, validationMessages.subfieldERequired);
              QuickMarcEditor.checkErrorMessage(rowIndex700, validationMessages.subfieldVUndefined);
              QuickMarcEditor.checkErrorMessage(
                rowIndex700,
                validationMessages.subfield9NonRepeatable,
              );

              // Verify inline error for undefined 799 field
              QuickMarcEditor.checkErrorMessage(
                field799Data.rowIndex,
                validationMessages.fieldUndefined,
              );

              // Verify inline errors for second 700 field
              QuickMarcEditor.checkErrorMessage(
                field700SecondData.rowIndex,
                validationMessages.firstIndicatorUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                field700SecondData.rowIndex,
                validationMessages.subfieldQRequired,
              );
              QuickMarcEditor.checkErrorMessage(
                field700SecondData.rowIndex,
                validationMessages.subfieldERequired,
              );
              QuickMarcEditor.checkErrorMessage(
                field700SecondData.rowIndex,
                validationMessages.indicatorInvalid,
              );

              // Verify inline errors for field with invalid tag
              QuickMarcEditor.checkErrorMessage(
                field70Data.rowIndex,
                validationMessages.fieldUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                field70Data.rowIndex,
                validationMessages.tagInvalid,
              );

              // Verify toast error notifications
              QuickMarcEditor.checkCallout(validationMessages.field245Required);
              QuickMarcEditor.verifyValidationCallout(5, 13);
            });
          },
        );
      });
    });
  });
});
