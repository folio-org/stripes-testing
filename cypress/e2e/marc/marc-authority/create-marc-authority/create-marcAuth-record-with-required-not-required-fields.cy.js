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
        tag400: '400',
        tag500: '500',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514978`,
        field100Content: `$a AT_C514978_MarcAuthority_${randomPostfix}`,
        field100Ind1: '1',
        field100Ind2: '\\',
        field400Content: '$a Standard Required field',
        field500Content: '$a Standard Not Required field',
        localRequiredFieldTag: '980',
        localNotRequiredFieldTag: '981',
        field980Content: '$a Local required field',
        field981Content: '$a Local Not Required field',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let field400Id;
      let field400Data;
      let localField980Id;
      let localField981Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();

        if (field400Id && field400Data) {
          cy.updateSpecificationField(field400Id, { ...field400Data, required: false });
        }
        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514978 Create MARC authority record with required / not required fields (Standard and Local) (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514978'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514978_');
          })
            .then(() => {
              // Mark standard field 400 as required
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field400 = findStandardField(fieldsResp.body.fields, testData.tag400);
                field400Id = field400.id;
                field400Data = field400;

                cy.updateSpecificationField(field400.id, { ...field400, required: true });
              });

              // Create required local field 980
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localRequiredFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localRequiredFieldTag,
                label: `AT_C514978_Local_Field_980_${randomPostfix}`,
                repeatable: true,
                required: true,
                deprecated: false,
              }).then((fieldResp) => {
                localField980Id = fieldResp.body.id;
              });

              // Create not-required local field 981
              cy.deleteSpecificationFieldByTag(
                authSpecId,
                testData.localNotRequiredFieldTag,
                false,
              );
              cy.createSpecificationField(authSpecId, {
                tag: testData.localNotRequiredFieldTag,
                label: `AT_C514978_Local_Field_981_${randomPostfix}`,
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
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: false });
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

              // Step 5: Add 100 heading
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 6: Add required standard 400, not-required standard 500, required local 980, not-required local 981
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.tag400,
                testData.field400Content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag400, testData.field400Content);

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag400,
                testData.tag500,
                testData.field500Content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag500, testData.field500Content);

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag500,
                testData.localRequiredFieldTag,
                testData.field980Content,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localRequiredFieldTag,
                testData.field980Content,
              );

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.localRequiredFieldTag,
                testData.localNotRequiredFieldTag,
                testData.field981Content,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localNotRequiredFieldTag,
                testData.field981Content,
              );

              // Step 7: Save & close → success; detail view shows all fields
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
              MarcAuthority.contains(testData.field400Content);
              MarcAuthority.contains(testData.field980Content);
            });
        },
      );
    });
  });
});
