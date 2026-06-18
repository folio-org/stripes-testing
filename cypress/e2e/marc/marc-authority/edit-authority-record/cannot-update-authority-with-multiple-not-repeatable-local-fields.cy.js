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
        tag980: '980',
        naturalId: `${randomLetters}C552360`,
        authorityHeading: `AT_C552360_MarcAuthority_${randomPostfix}`,
        field980Content1: '$a First not-repeatable field',
        field980Content2: '$a Second not-repeatable field',
        errorFieldNonRepeatable: 'Field is non-repeatable.',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let localField980Id;

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

        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C552360 Cannot update MARC authority record with multiple not-repeatable "Local" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C552360'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C552360_');

            MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });

            // Create local not-repeatable field 980
            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag980, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag980,
              label: `AT_C552360_LocalField_980_${randomPostfix}`,
              repeatable: false,
              required: false,
              deprecated: false,
            }).then((resp) => {
              localField980Id = resp.body.id;
            });
          })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

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

              // Step 2: Add two not-repeatable 980 fields
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.tag980,
                testData.field980Content1,
              );
              QuickMarcEditor.checkContent(testData.field980Content1, 6);

              QuickMarcEditor.addEmptyFields(6);
              QuickMarcEditor.checkEmptyFieldAdded(7);
              QuickMarcEditor.addValuesToExistingField(
                6,
                testData.tag980,
                testData.field980Content2,
              );
              QuickMarcEditor.checkContent(testData.field980Content2, 7);

              // Step 3: Click "Save & close" → fail error on second 980 field, 1 fail error
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 1);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(7, testData.errorFieldNonRepeatable);
              QuickMarcEditor.checkButtonsEnabled();

              // Step 4: Click "Save & keep editing" → same fail error
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.verifyValidationCallout(0, 1);
              QuickMarcEditor.checkErrorMessage(7, testData.errorFieldNonRepeatable);
              QuickMarcEditor.checkButtonsEnabled();
            });
        },
      );
    });
  });
});
