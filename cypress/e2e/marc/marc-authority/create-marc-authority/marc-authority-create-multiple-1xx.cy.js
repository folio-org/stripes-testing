import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const prefix = 'n';
      const naturalId = `${randomNDigitNumber(18)}423521`;
      const sourceFileName = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityHeadingPrefix = `AT_C423521_MarcAuthority_${randomPostfix}`;

      const testData = {
        tag010: '010',
        tag100: '100',
        tag101: '101',
        tag109: '109',
        tag110: '110',
        tag140: '140',
        tag145: '145',
        tag400: '400',
        field1Content: `$a ${authorityHeadingPrefix} one`,
        field2Content: `$a ${authorityHeadingPrefix} two`,
        error1XXNonRepeatableRequired: 'Fail: Field 1XX is non-repeatable and required.',
        errorFieldNonRepeatable: 'Fail: Field is non-repeatable.',
        errorFieldUndefined: 'Warn: Field is undefined.',
      };

      const fieldPairs = [
        // Step 2: 2 same Standard (100, 100) → 0W + 3F
        {
          tag1: testData.tag100,
          tag2: testData.tag100,
          warnCount: 0,
          failCount: 3,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.error1XXNonRepeatableRequired, testData.errorFieldNonRepeatable],
        },
        // Step 3: 2 different Standard (100, 110) → 0W + 2F
        {
          tag1: testData.tag100,
          tag2: testData.tag110,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.error1XXNonRepeatableRequired],
        },
        // Step 6: 2 same Local (140, 140) → 0W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag140,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.error1XXNonRepeatableRequired],
        },
        // Step 7: 2 different Local (140, 145) → 0W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag145,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.error1XXNonRepeatableRequired],
        },
        // Step 8: 1 Standard + 1 Local (110, 145) → 0W + 2F
        {
          tag1: testData.tag110,
          tag2: testData.tag145,
          warnCount: 0,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.error1XXNonRepeatableRequired],
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
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
        // Step 12: 1 Local + 1 undefined (140, 109) → 2W + 2F
        {
          tag1: testData.tag140,
          tag2: testData.tag109,
          warnCount: 4,
          failCount: 2,
          field1Errors: [testData.error1XXNonRepeatableRequired],
          field2Errors: [testData.errorFieldUndefined, testData.error1XXNonRepeatableRequired],
        },
      ];

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

        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFileName);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423521_');
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C423521 Cannot create MARC authority record with multiple 1XX fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423521'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423521_');

            // Create local 1XX fields
            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag140, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag140,
              label: `AT_C423521_LocalField_140_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
            }).then((resp) => {
              localField140Id = resp.body.id;
            });

            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag145, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag145,
              label: `AT_C423521_LocalField_145_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
            }).then((resp) => {
              localField145Id = resp.body.id;
            });
          })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });
                ManageAuthorityFiles.setAuthorityFileToActiveViaApi(sourceFileName);

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            })
            .then(() => {
              // Steps 1-4: Create a new MARC authority record with basic fields
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkRecordStatusNew();
              MarcAuthority.setValid008DropdownValues();
              // Select authority file (LCNAF)
              MarcAuthority.selectSourceFile(sourceFileName);
              QuickMarcEditor.addNewField(testData.tag010, `$a ${prefix}${naturalId}`, 3);
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${prefix}${naturalId}`);

              // Step 5: Add 2 empty fields
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);

              // Steps 6-13: iterate through field pair scenarios
              fieldPairs.forEach((pair) => {
                QuickMarcEditor.addValuesToExistingField(4, pair.tag1, testData.field1Content);
                QuickMarcEditor.verifyTagValue(5, pair.tag1);
                QuickMarcEditor.checkContent(testData.field1Content, 5);
                QuickMarcEditor.addValuesToExistingField(5, pair.tag2, testData.field2Content);
                QuickMarcEditor.verifyTagValue(6, pair.tag2);
                QuickMarcEditor.checkContent(testData.field2Content, 6);

                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.verifyValidationCallout(pair.warnCount, pair.failCount);
                QuickMarcEditor.closeAllCallouts();
                pair.field1Errors.forEach((err) => QuickMarcEditor.checkErrorMessage(5, err));
                pair.field2Errors.forEach((err) => QuickMarcEditor.checkErrorMessage(6, err));
              });

              // Step 14: Delete the undefined 1XX field (109 at row 5)
              QuickMarcEditor.updateExistingTagValue(6, testData.tag400);
              QuickMarcEditor.verifyTagValue(6, testData.tag400);
              QuickMarcEditor.deleteFieldAndCheck(6, testData.tag400);
              QuickMarcEditor.checkTagAbsent(testData.tag109);
              QuickMarcEditor.checkTagAbsent(testData.tag400);
              QuickMarcEditor.checkNoDeletePlaceholder();

              // Step 15: Save & close → record saved successfully
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              MarcAuthority.verifyAfterSaveAndClose();
              MarcAuthority.checkTagInRow(5, fieldPairs.at(-1).tag1);
              MarcAuthority.contains(testData.field1Content);
            });
        },
      );
    });
  });
});
