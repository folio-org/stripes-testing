import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  findStandardField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag046: '046',
        tag100: '100',
        tag400: '400',
        tag500: '500',
        tag510: '510',
        tag980: '980',
        tag981: '981',
        authorityHeading: `AT_C514979_MarcAuthority_${randomPostfix}`,
        field100UpdatedContent: `$a AT_C514979_MarcAuthority_${randomPostfix} test`,
        // Standard fields to add in editor (Steps 2-3)
        field400Content: '$a Test 400 Reference',
        field500Content: '$a Test 500 See Also',
        field510Content: '$a Test 510 Not Required',
        field046Content: '$f 1922-12-28 $g 2018-11-12 $2 edtf',
        field500WithJContent: '$j Test',
        // Local fields
        field980Content: '$a Required local field',
        field981Content: '$a Not required local field',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let field400Id;
      let field400OriginalData;
      let field500Id;
      let field500OriginalData;
      let field510Id;
      let field510OriginalData;
      let localField980Id;
      let localField981Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          cy.syncSpecifications(authSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        // Restore standard fields to original required state
        if (field400Id && field400OriginalData) {
          cy.updateSpecificationField(
            field400Id,
            { ...field400OriginalData, required: false },
            false,
          );
        }
        if (field500Id && field500OriginalData) {
          cy.updateSpecificationField(
            field500Id,
            { ...field500OriginalData, required: false },
            false,
          );
        }
        if (field510Id && field510OriginalData) {
          cy.updateSpecificationField(
            field510Id,
            { ...field510OriginalData, required: false },
            false,
          );
        }

        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514979 Edit MARC authority record with required / not required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514979'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514979_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514979`, '', [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });
          })
            .then(() => {
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const fields = fieldsResp.body.fields;

                // Mark 400 as required
                const field400 = findStandardField(fields, testData.tag400);
                if (field400) {
                  field400Id = field400.id;
                  field400OriginalData = { ...field400 };
                  cy.updateSpecificationField(field400Id, { ...field400, required: true });
                }

                // Mark 500 as required
                const field500 = findStandardField(fields, testData.tag500);
                if (field500) {
                  field500Id = field500.id;
                  field500OriginalData = { ...field500 };
                  cy.updateSpecificationField(field500Id, { ...field500, required: true });
                }

                // Keep 510 as not required (record its original state)
                const field510 = findStandardField(fields, testData.tag510);
                if (field510) {
                  field510Id = field510.id;
                  field510OriginalData = { ...field510 };
                }
              });

              // Create required local field 980
              cy.deleteSpecificationFieldByTag(authSpecId, testData.tag980, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.tag980,
                label: `AT_C514979_LocalField_980_${randomPostfix}`,
                repeatable: true,
                required: true,
                deprecated: false,
              }).then((fieldResp) => {
                localField980Id = fieldResp.body.id;
              });

              // Create not-required local field 981
              cy.deleteSpecificationFieldByTag(authSpecId, testData.tag981, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.tag981,
                label: `AT_C514979_LocalField_981_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField981Id = fieldResp.body.id;
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
                });
              });
            })
            .then(() => {
              // Step 1: Open authority record for editing
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthorities.selectAuthorityById(createdAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Add required / not required standard and local fields
              // Add 400 (required standard), 500 (required standard), 510 (not required standard)
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.tag400,
                testData.field400Content,
              );

              QuickMarcEditor.addEmptyFields(6);
              QuickMarcEditor.checkEmptyFieldAdded(7);
              QuickMarcEditor.addValuesToExistingField(
                6,
                testData.tag500,
                testData.field500Content,
              );

              QuickMarcEditor.addEmptyFields(7);
              QuickMarcEditor.checkEmptyFieldAdded(8);
              QuickMarcEditor.addValuesToExistingField(
                7,
                testData.tag510,
                testData.field510Content,
              );

              // Add required local field 980
              QuickMarcEditor.addEmptyFields(8);
              QuickMarcEditor.checkEmptyFieldAdded(9);
              QuickMarcEditor.addValuesToExistingField(
                8,
                testData.tag980,
                testData.field980Content,
              );

              // Add not-required local field 981
              QuickMarcEditor.addEmptyFields(9);
              QuickMarcEditor.checkEmptyFieldAdded(10);
              QuickMarcEditor.addValuesToExistingField(
                9,
                testData.tag981,
                testData.field981Content,
              );

              // Step 3: Add 046 and 500 (with $j) fields
              QuickMarcEditor.addEmptyFields(10);
              QuickMarcEditor.checkEmptyFieldAdded(11);
              QuickMarcEditor.addValuesToExistingField(
                10,
                testData.tag046,
                testData.field046Content,
              );

              QuickMarcEditor.addEmptyFields(11);
              QuickMarcEditor.checkEmptyFieldAdded(12);
              QuickMarcEditor.addValuesToExistingField(
                11,
                testData.tag500,
                testData.field500WithJContent,
                '1',
                '\\',
              );

              // Step 4: Update 1XX field
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field100UpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100UpdatedContent);

              // Step 5: Click "Save & close" (ignore Warn errors)
              QuickMarcEditor.saveAndCloseWithValidationWarnings();

              // Verify: success notification, editor closed, detail view shown
              MarcAuthority.verifyAfterSaveAndClose();
              MarcAuthority.contains(testData.field100UpdatedContent);
            });
        },
      );
    });
  });
});
