import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  findStandardField,
  findLocalField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag100: '100',
        tag500: '500',
        tag948: '948',
        authorityHeading: `AT_C552457_MarcAuthority_${randomPostfix}`,
        field1XXUpdatedContent: `$a AT_C552457_MarcAuthority_${randomPostfix} test`,
        errorMessageField500Required: 'Field 500 is required.',
        errorMessageField948NonRepeatable: 'Fail: Field is non-repeatable.',
        errorMessageField948Undefined: 'Warn: Field is undefined.',
        expectedWarnCountStep3: 6,
        expectedFailCountStep3: 2,
        expectedWarnCountStep6: 2,
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag948,
          content: '$a First 948 entry',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag948,
          content: '$a Second 948 entry',
          indicators: ['\\', '\\'],
        },
      ];

      let authSpecId;
      let createdAuthorityId;
      let user;
      let field500Id;
      let field500OriginalData;
      let field948Id;

      before('Create test data', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          cy.syncSpecifications(authSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        if (field500Id && field500OriginalData) {
          cy.updateSpecificationField(
            field500Id,
            { ...field500OriginalData, required: false },
            false,
          );
        }
        if (field948Id) {
          cy.deleteSpecificationField(field948Id, false);
        }

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C552457 Verify that edited MARC authority record is checked against the last version of MARC validation rules (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C552457', 'nonParallel'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C552457_');
          })
            .then(() => {
              MarcAuthorities.createMarcAuthorityViaAPI(randomPostfix, '', authorityFields).then(
                (id) => {
                  createdAuthorityId = id;
                  toggleAllUndefinedValidationRules(authSpecId, { enable: true });
                },
              );
            })
            .then(() => {
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field500 = findStandardField(fieldsResp.body.fields, testData.tag500);
                if (field500) {
                  field500Id = field500.id;
                  field500OriginalData = { ...field500 };
                  cy.updateSpecificationField(field500Id, { ...field500, required: true }, false);
                }

                const existingField948 = findLocalField(fieldsResp.body.fields, testData.tag948);
                if (existingField948) {
                  cy.deleteSpecificationField(existingField948.id, false);
                }

                cy.createSpecificationField(
                  authSpecId,
                  {
                    tag: testData.tag948,
                    label: `AT_C552457_Local_Field_948_${randomPostfix}`,
                    repeatable: false,
                    required: false,
                    deprecated: false,
                  },
                  false,
                ).then((fieldResp) => {
                  field948Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                Permissions.specificationStorageSpecificationItemGet.gui,
                Permissions.specificationStorageSpecificationCollectionGet.gui,
                Permissions.specificationStorageCreateSpecificationField.gui,
                Permissions.specificationStorageGetSpecificationFields.gui,
                Permissions.specificationStorageUpdateSpecificationField.gui,
                Permissions.specificationStorageDeleteSpecificationField.gui,
              ]).then((userProperties) => {
                user = userProperties;

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
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Update $a subfield of 1XX field (add "test")
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field1XXUpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field1XXUpdatedContent);

              // Step 3: Save & keep editing - 500 required error + 948 non-repeatable fails
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkCallout(testData.errorMessageField500Required);
              QuickMarcEditor.verifyValidationCallout(
                testData.expectedWarnCountStep3,
                testData.expectedFailCountStep3,
              );
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessageForField(
                6,
                testData.errorMessageField948NonRepeatable,
              );
              QuickMarcEditor.checkButtonsEnabled();
            })
            .then(() => {
              // Steps 4-5: API - update 500 to not required, delete 948 spec field
              cy.updateSpecificationField(
                field500Id,
                { ...field500OriginalData, required: false },
                false,
              );

              cy.deleteSpecificationField(field948Id, false).then(() => {
                field948Id = null;
              });
            })
            .then(() => {
              cy.wait(2000);

              // Step 6: Save & keep editing - 948 now undefined (warn)
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.verifyValidationCallout(testData.expectedWarnCountStep6, 0);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkWarningMessageForField(
                5,
                testData.errorMessageField948Undefined,
              );
              QuickMarcEditor.checkWarningMessageForField(
                6,
                testData.errorMessageField948Undefined,
              );

              // Step 7: Save & keep editing - should succeed
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkButtonsDisabled();
            });
        },
      );
    });
  });
});
