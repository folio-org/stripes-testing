import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(18);

      const testData = {
        tag100: '100',
        tag101: '101',
        tag109: '109',
        tag110: '110',
        tag140: '140',
        tag145: '145',
        tag400: '400',
        naturalId: `${randomLetters}C519982`,
        authorityHeading: `AT_C519982_MarcAuthority_${randomPostfix}`,
        field1Content: '$a AT_C519982 1XX field one',
        field2Content: '$a AT_C519982 1XX field two',
        error1XXNonRepeatableRequired: 'Fail: Field 1XX is non-repeatable and required.',
        errorFieldNonRepeatable: 'Fail: Field is non-repeatable.',
        errorFieldUndefined: 'Warn: Field is undefined.',
        helpLinkUrl: 'https://www.loc.gov/marc/authority/ad100.html',
        helpLinkInnerText: '\nHelp',
      };

      const fieldPairs = [
        // Step 2: 2 same Standard (100, 100) → 0W + 3F
        {
          tag1: testData.tag100,
          tag2: testData.tag100,
          warnCount: 0,
          failCount: 3,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [
            testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText,
            testData.errorFieldNonRepeatable,
          ],
        },
        // Step 3: 2 different Standard (100, 110) → 0W + 2F
        {
          tag1: testData.tag100,
          tag2: testData.tag110,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
        },
        // Step 6: 2 same Local (140, 140) → 0W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag140,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
        },
        // Step 7: 2 different Local (140, 145) → 0W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag145,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
        },
        // Step 8: 1 Standard + 1 Local (110, 145) → 0W + 2F
        {
          tag1: testData.tag110,
          tag2: testData.tag145,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
        },
        // Step 9: 2 same undefined (101, 101) → 2W + 2F
        {
          tag1: testData.tag101,
          tag2: testData.tag101,
          warnCount: 2,
          failCount: 2,
          field1Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
        // Step 10: 2 different undefined (101, 109) → 2W + 2F
        {
          tag1: testData.tag101,
          tag2: testData.tag109,
          warnCount: 2,
          failCount: 2,
          field1Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
        // Step 11: 1 Standard + 1 undefined (100, 109) → 1W + 2F
        {
          tag1: testData.tag100,
          tag2: testData.tag109,
          warnCount: 2,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
        // Step 12: 1 Local + 1 undefined (140, 109) → 2W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag109,
          warnCount: 4,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired + testData.helpLinkInnerText],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
      ];

      let createdAuthorityId;
      let user;
      let authSpecId;
      let localField140Id;
      let localField145Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          cy.syncSpecifications(authSpecId);
          toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        if (localField140Id) cy.deleteSpecificationField(localField140Id, false);
        if (localField145Id) cy.deleteSpecificationField(localField145Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C519982 Cannot update MARC authority record with multiple 1XX fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C519982'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C519982_');

            MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });

            // Create local 1XX fields with help URLs
            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag140, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag140,
              label: `AT_C519982_LocalField_140_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
              url: 'https://www.loc.gov/marc/authority/ad140.html',
            }).then((resp) => {
              localField140Id = resp.body.id;
            });

            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag145, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag145,
              label: `AT_C519982_LocalField_145_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
              url: 'https://www.loc.gov/marc/authority/ad145.html',
            }).then((resp) => {
              localField145Id = resp.body.id;
            });
          })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                  authRefresh: true,
                });
              });
            })
            .then(() => {
              // Step 1: Open authority record for editing
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthorities.selectAuthorityById(createdAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.authorityHeading);
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Pre-add second 1XX row (below existing 100 at row 4)
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);

              // Steps 2-3 and 6-12: iterate through field pair scenarios
              fieldPairs.forEach((pair, index) => {
                QuickMarcEditor.addValuesToExistingField(3, pair.tag1, testData.field1Content);
                QuickMarcEditor.verifyTagValue(4, pair.tag1);
                QuickMarcEditor.addValuesToExistingField(4, pair.tag2, testData.field2Content);
                QuickMarcEditor.verifyTagValue(5, pair.tag2);

                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.verifyValidationCallout(pair.warnCount, pair.failCount);
                QuickMarcEditor.closeAllCallouts();
                pair.field1Errors.forEach((err) => QuickMarcEditor.checkErrorMessage(4, err));
                pair.field2Errors.forEach((err) => QuickMarcEditor.checkErrorMessage(5, err));

                // Steps 4-5: After step 3 (index 1), verify Help hyperlink is present
                if (index === 1) {
                  QuickMarcEditor.checkErrorMessageAndHelpLinkForField({
                    errorMessage: pair.field1Errors[0],
                    helpLinkUrl: testData.helpLinkUrl,
                    rowIndex: 4,
                  });
                }
              });

              // Step 13: Delete the undefined 1XX field (109 at row 5)
              QuickMarcEditor.updateExistingTagValue(5, testData.tag400);
              QuickMarcEditor.verifyTagValue(5, testData.tag400);
              QuickMarcEditor.deleteFieldAndCheck(5, testData.tag400);
              QuickMarcEditor.checkTagAbsent(testData.tag109);
              QuickMarcEditor.checkNoDeletePlaceholder();

              // Step 14: Save & close → record saved successfully
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              MarcAuthority.verifyAfterSaveAndClose();
              MarcAuthority.checkTagInRow(4, fieldPairs.at(-1).tag1);
              MarcAuthority.contains(testData.field1Content);
            });
        },
      );
    });
  });
});
