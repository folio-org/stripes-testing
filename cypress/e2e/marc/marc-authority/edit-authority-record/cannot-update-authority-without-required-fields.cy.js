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
  describe('MARC authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(18);

      const testData = {
        tag100: '100',
        tag400: '400',
        tag500: '500',
        tag980: '980',
        authorityHeading: `AT_C514971_MarcAuthority_${randomPostfix}`,
        field100UpdatedContent: `$a AT_C514971_MarcAuthority_${randomPostfix} test`,
        errorField400Required: 'Field 400 is required.',
        errorField500Required: 'Field 500 is required.',
        errorField980Required: 'Field 980 is required.',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let field400Id;
      let field400OriginalData;
      let field500Id;
      let field500OriginalData;
      let localField980Id;

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
        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514971 Cannot update MARC authority record without required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514971'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514971_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514971`, '', [
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
              // Mark 400 and 500 standard fields as required
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const fields = fieldsResp.body.fields;

                const field400 = findStandardField(fields, testData.tag400);
                if (field400) {
                  field400Id = field400.id;
                  field400OriginalData = { ...field400 };
                  cy.updateSpecificationField(field400Id, { ...field400, required: true });
                }

                const field500 = findStandardField(fields, testData.tag500);
                if (field500) {
                  field500Id = field500.id;
                  field500OriginalData = { ...field500 };
                  cy.updateSpecificationField(field500Id, { ...field500, required: true });
                }
              });

              // Create required local field 980
              cy.deleteSpecificationFieldByTag(authSpecId, testData.tag980, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.tag980,
                label: `AT_C514971_LocalField_980_${randomPostfix}`,
                repeatable: true,
                required: true,
                deprecated: false,
              }).then((fieldResp) => {
                localField980Id = fieldResp.body.id;
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
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Verify record has no required fields (400, 500, 980 are absent)
              QuickMarcEditor.checkTagAbsent(testData.tag400);
              QuickMarcEditor.checkTagAbsent(testData.tag500);
              QuickMarcEditor.checkTagAbsent(testData.tag980);

              // Step 3: Update 1XX field
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field100UpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100UpdatedContent);

              // Step 4: Click "Save & close" → 3 fail errors for missing required fields
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 3);
              QuickMarcEditor.checkCallout(testData.errorField400Required);
              QuickMarcEditor.checkCallout(testData.errorField500Required);
              QuickMarcEditor.checkCallout(testData.errorField980Required);
              QuickMarcEditor.verifySaveAndCloseButtonEnabled();
            });
        },
      );
    });
  });
});
