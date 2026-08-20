import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import {
  getAuthoritySpec,
  findStandardField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514970`,
        field100Content: `$a AT_C514970_MarcAuthority_${randomPostfix}`,
        field100Ind1: '1',
        field100Ind2: '\\',
        localRequiredFieldTag: '980',
        standardRequiredFieldTag: '400',
      };

      let user;
      let authSpecId;
      let field400Id;
      let field400Data;
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
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        // Restore standard 400 field to not-required
        if (field400Id && field400Data) {
          cy.updateSpecificationField(field400Id, { ...field400Data, required: false });
        }
        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514970 Cannot create MARC authority record without required fields (Standard and Local) (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514970'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514970_');
          })
            .then(() => {
              // Mark standard field 400 as required
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field400 = findStandardField(
                  fieldsResp.body.fields,
                  testData.standardRequiredFieldTag,
                );
                field400Id = field400.id;
                field400Data = field400;

                cy.updateSpecificationField(field400.id, { ...field400, required: true });
              });

              // Create required local field 980
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localRequiredFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localRequiredFieldTag,
                label: `AT_C514970_Local_Field_980_${randomPostfix}`,
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
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });
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

              // Step 3: Set valid 008 dropdown values
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

              // Step 2: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 4: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 5: Add 100 field — intentionally omit required 400 and 980 fields
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 7: Save → 2 fail errors: 400 required + 980 required
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 2);
              QuickMarcEditor.checkCallout(`Field ${testData.localRequiredFieldTag} is required.`);
              QuickMarcEditor.checkCallout(
                `Field ${testData.standardRequiredFieldTag} is required.`,
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);
            });
        },
      );
    });
  });
});
