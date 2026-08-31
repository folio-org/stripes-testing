import { including } from '@interactors/html';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getAuthoritySpec,
  findStandardField,
  findLocalField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const indicatorWarningText = (position, value) => `Warn: ${position === 0 ? 'First' : 'Second'} Indicator '${value}' is undefined.`;
      const subfieldWarningText = (code) => `Warn: Subfield '${code}' is undefined.`;

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag500: '500',
        tag948: '948',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}552459`,
        field100Content: `$a AT_C552459_MarcAuthority_${randomPostfix}`,
        field100Ind1: '1',
        field100Ind2: '\\',
        field100UpdatedContent: `$a AT_C552459_MarcAuthority_${randomPostfix} test2`,
        field948Content: '$a Undefined field',
        field500Content: '$a Standard field',
        field500Ind1: '1',
        field500Ind2: '\\',
        errorField500Required: 'Field 500 is required.',
        errorField948Undefined: 'Warn: Field is undefined.',
        tag948RowIndex: 6,
      };

      let user;
      let authSpecId;
      let createdAuthorityId;
      let field500Id;
      let field500OriginalData;
      let field948Id;

      before('Get authority spec', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        if (field500Id && field500OriginalData) {
          cy.updateSpecificationField(
            field500Id,
            { ...field500OriginalData, required: false },
            false,
          );
        }
        if (field948Id) cy.deleteSpecificationField(field948Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C552459 Verify that created MARC authority record is checked against the last version of MARC validation rules (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C552459'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C552459_');
            toggleAllUndefinedValidationRules(authSpecId, { enable: true });

            cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
              const field500 = findStandardField(fieldsResp.body.fields, testData.tag500);
              field500Id = field500.id;
              field500OriginalData = { ...field500 };

              const existing948 = findLocalField(fieldsResp.body.fields, testData.tag948);
              if (existing948) cy.deleteSpecificationField(existing948.id, false);
            });
          })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
                Permissions.specificationStorageSpecificationItemGet.gui,
                Permissions.specificationStorageSpecificationCollectionGet.gui,
                Permissions.specificationStorageCreateSpecificationField.gui,
                Permissions.specificationStorageGetSpecificationFields.gui,
                Permissions.specificationStorageUpdateSpecificationField.gui,
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

              // Step 6: Add undefined 948 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.tag948,
                testData.field948Content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag948, testData.field948Content);

              // Step 7: Save & close → 1 warn (948 field is undefined)
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(1);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkWarningMessageForField(
                testData.tag948RowIndex,
                testData.errorField948Undefined,
              );

              // Step 8: Update $a subfield of 1XX field
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field100UpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100UpdatedContent);
            })
            .then(() => {
              // Step 9: Create specification field for 948 (define it as a local field)
              cy.createSpecificationField(
                authSpecId,
                {
                  tag: testData.tag948,
                  label: `AT_C552459_Local_Field_948_${randomPostfix}`,
                  url: 'http://www.example.org/field948.html',
                  repeatable: true,
                  required: false,
                  deprecated: false,
                },
                false,
              ).then((resp) => {
                field948Id = resp.body.id;
              });

              // Step 10: Update field 500 to be required
              cy.updateSpecificationField(
                field500Id,
                { ...field500OriginalData, required: true },
                false,
              );
            })
            .then(() => {
              cy.wait(2000);

              // Step 11: Save & close again → 1 fail (500 required) + 3 warns (948 ind/subfield undefined)
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkCallout(testData.errorField500Required);
              QuickMarcEditor.verifyValidationCallout(3, 1);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkWarningMessageForFieldByTag(
                testData.tag948,
                including(indicatorWarningText(0, '\\')),
              );
              QuickMarcEditor.checkWarningMessageForFieldByTag(
                testData.tag948,
                including(indicatorWarningText(1, '\\')),
              );
              QuickMarcEditor.checkWarningMessageForFieldByTag(
                testData.tag948,
                including(subfieldWarningText('a')),
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 12: Add required 500 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.tag500,
                testData.field500Content,
                testData.field500Ind1,
                testData.field500Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag500, testData.field500Content);

              // Step 13: Save & close → record saved successfully
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.field100UpdatedContent);
              MarcAuthority.contains(testData.field500Content);
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
            });
        },
      );
    });
  });
});
