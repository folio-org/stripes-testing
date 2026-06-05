import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit linked MARC authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(17);
      const sourceFilePrefix = randomLetters;
      const rowIndex1XX = 5;
      const rowIndex199 = rowIndex1XX + 1;

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag110: '110',
        tag199: '199',
        tag245: '245',
        authorityPrefix: sourceFilePrefix,
        authorityNaturalId: 566593,
        authorityHeading: `AT_C566593_AuthorityHeading_${randomPostfix}`,
        authorityField100Content: `$a AT_C566593_AuthorityHeading_${randomPostfix}`,
        bibTitle: `AT_C566593_MarcBibInstance_${randomPostfix}`,
        requiedSubfield: 'e',
      };

      const mainField1XXUpdatedValues = {
        ind1: '$',
        ind2: '5',
        content: `${testData.authorityField100Content} $f NR subfield 1 $f NR subfield 2 $t subfield t $9 undefined subfield 9`,
      };

      const field199Data = {
        rowIndex: rowIndex199,
        tag: testData.tag199,
        content: '$a Undefined 1XX field',
        indicator1: '1',
        indicator2: '&',
      };

      const validationMessages = {
        secondIndicatorUndefined: "Warn: Second Indicator '5' is undefined.",
        subfield9Undefined: "Warn: Subfield '9' is undefined.",
        cannotChange1XX:
          'Fail: Cannot change the saved MARC authority field 100 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        cannotAddT:
          'Fail: Cannot add a $t to the 100 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
        nonRepeatableRequired1XX: 'Fail: Field 1XX is non-repeatable and required.',
        indicatorInvalid:
          "Fail: Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'.",
        subfieldERequired: "Fail: Subfield 'e' is required.",
        subfieldFNonRepeatable: "Fail: Subfield 'f' is non-repeatable.",
        fieldUndefined: 'Warn: Field is undefined.',
      };

      const marcAuthorityFields = [
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
      ];

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
        {
          tag: testData.tag100,
          content: testData.authorityField100Content,
          indicators: ['1', '\\'],
        },
      ];

      let userData;
      let authSpecId;
      let field110Id;
      let subfieldEId;
      let subfieldEOriginalData;
      const createdBibIds = [];
      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C566593_');

        cy.then(() => {
          getAuthoritySpec().then((authSpec) => {
            authSpecId = authSpec.id;
            cy.syncSpecifications(authSpec.id);
          });
        })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authorityPrefix,
              testData.authorityNaturalId,
              marcAuthorityFields,
            ).then((authorityId) => {
              createdAuthorityIds.push(authorityId);
              testData.authorityId = authorityId;
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdBibIds.push(instanceId);
              },
            );
          })
          .then(() => {
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdBibIds[0],
              authorityIds: [testData.authorityId],
              bibFieldTags: [testData.tag100],
              authorityFieldTags: [testData.tag100],
              finalBibFieldContents: [testData.authorityField100Content],
            });
            MarcAuthorities.waitAuthorityLinked(testData.authorityId, 1);
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((userProperties) => {
              userData = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();

        toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        if (subfieldEId && subfieldEOriginalData) {
          cy.updateSpecificationSubfield(
            subfieldEId,
            { ...subfieldEOriginalData, required: false },
            false,
          );
        }
        cy.syncSpecifications(authSpecId);

        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        createdBibIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C566593 Trigger validation errors for 1XX field of linked MARC authority record (saved link) on "Edit MARC authority record" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C566593'] },
        () => {
          cy.then(() => {
            cy.getAdminToken();
            cy.getSpecificationFields(authSpecId).then((response) => {
              const field110 = findStandardField(response.body.fields, testData.tag110);
              if (field110) {
                field110Id = field110.id;

                cy.getSpecificationFieldSubfields(field110Id).then((subfieldResponse) => {
                  const subfieldE = findStandardSubfield(
                    subfieldResponse.body.subfields,
                    testData.requiedSubfield,
                  );

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
                });
              }
            });
          })
            .then(() => {
              toggleAllUndefinedValidationRules(authSpecId, { enable: true });
            })
            .then(() => {
              // Step 1: Login and navigate to MARC Authority
              cy.login(userData.username, userData.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
                authRefresh: true,
              });

              // Step 1: Open authority record in edit mode
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();
              cy.wait(3000);

              // Step 2: Change 1XX tag from 100 to 110
              QuickMarcEditor.updateExistingTagValue(rowIndex1XX, testData.tag110);
              QuickMarcEditor.verifyTagValue(rowIndex1XX, testData.tag110);

              // Step 3: Enter invalid value in Ind 1
              QuickMarcEditor.updateIndicatorValue(
                testData.tag110,
                mainField1XXUpdatedValues.ind1,
                0,
              );

              // Step 4: Enter undefined indicator in Ind 2
              QuickMarcEditor.updateIndicatorValue(
                testData.tag110,
                mainField1XXUpdatedValues.ind2,
                1,
              );

              // Steps 5 & 6: Add non-repeatable subfields and additional subfields to 1XX field
              QuickMarcEditor.updateExistingField(
                testData.tag110,
                mainField1XXUpdatedValues.content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag110, mainField1XXUpdatedValues.content);

              // Step 7: Add undefined 1XX field (199)
              QuickMarcEditor.addEmptyFields(rowIndex1XX);
              QuickMarcEditor.checkEmptyFieldAdded(field199Data.rowIndex);
              QuickMarcEditor.addValuesToExistingField(
                rowIndex1XX,
                field199Data.tag,
                field199Data.content,
                field199Data.indicator1,
                field199Data.indicator2,
              );
              QuickMarcEditor.checkContentByTag(field199Data.tag, field199Data.content);

              // Step 8: Click "Save & keep editing"
              QuickMarcEditor.clickSaveAndKeepEditingButton();

              // Step 9: Verify inline errors for 1XX field
              QuickMarcEditor.checkErrorMessage(
                rowIndex1XX,
                validationMessages.secondIndicatorUndefined,
              );
              QuickMarcEditor.checkErrorMessage(rowIndex1XX, validationMessages.subfield9Undefined);
              QuickMarcEditor.checkErrorMessage(rowIndex1XX, validationMessages.cannotChange1XX);
              QuickMarcEditor.checkErrorMessage(rowIndex1XX, validationMessages.cannotAddT);
              QuickMarcEditor.checkErrorMessage(
                rowIndex1XX,
                validationMessages.nonRepeatableRequired1XX,
              );
              QuickMarcEditor.checkErrorMessage(rowIndex1XX, validationMessages.indicatorInvalid);
              QuickMarcEditor.checkErrorMessage(rowIndex1XX, validationMessages.subfieldERequired);
              QuickMarcEditor.checkErrorMessage(
                rowIndex1XX,
                validationMessages.subfieldFNonRepeatable,
              );

              // Step 10: Verify inline errors for undefined 199 field
              QuickMarcEditor.checkErrorMessage(
                field199Data.rowIndex,
                validationMessages.fieldUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                field199Data.rowIndex,
                validationMessages.nonRepeatableRequired1XX,
              );

              // Step 11: Verify validation callout toast
              QuickMarcEditor.verifyValidationCallout(3, 7);
            });
        },
      );
    });
  });
});
