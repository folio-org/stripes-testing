import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag980: '980',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}552359`,
        field100Content: `$a AT_C552359_MarcAuthority_${randomPostfix}`,
        field100Ind1: '1',
        field100Ind2: '\\',
        field980Content1: '$a First not-repeatable field',
        field980Content2: '$a Second not-repeatable field',
        errorFieldNonRepeatable: 'Field is non-repeatable.',
        field980SecondRowIndex: 7,
      };

      let user;
      let authSpecId;
      let localField980Id;

      before('Get authority spec', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);
        cy.syncSpecifications(authSpecId);
        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C552359 Cannot create MARC authority record with multiple not-repeatable "Local" fields (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C552359'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C552359_');

            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag980, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag980,
              label: `AT_C552359_LocalField_980_${randomPostfix}`,
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
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;
                MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile);
                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            })
            .then(() => {
              // Step 1: Open new MARC authority record form
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkPaneheaderContains(MarcAuthority.createAuthorityPaneTitleRegExp);
              MarcAuthority.checkSourceFileSelectShown();

              // Step 2: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 3: Set valid 008 dropdown values
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

              // Step 4: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 5: Add 100 heading
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 6: Add first not-repeatable 980 field after 100
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.tag980,
                testData.field980Content1,
              );
              QuickMarcEditor.checkContentByTag(testData.tag980, testData.field980Content1);

              // Step 6 (cont): Add second not-repeatable 980 field after first 980
              cy.wait(1000);
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag980,
                testData.tag980,
                testData.field980Content2,
              );
              QuickMarcEditor.checkContent(
                testData.field980Content2,
                testData.field980SecondRowIndex,
              );

              // Step 7: Save & close → inline fail error on second 980; toast shows 1 fail error
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 1);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.field980SecondRowIndex,
                testData.errorFieldNonRepeatable,
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);
            });
        },
      );
    });
  });
});
