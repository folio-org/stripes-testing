import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getAuthoritySpec,
  findLocalField,
  generateTestFieldData,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      const randomPostfix = getRandomPostfix();
      const testCaseId = 'C523617';
      const authorityHeading = `AT_${testCaseId}_MarcAuthority_${randomPostfix}`;
      const tag100rowIndex = 4;
      const randomLetters = getRandomLetters(18);

      const testData = {
        tag008: '008',
        tag090: '090',
        tag100: '100',
        tag955: '955',
        naturalId: `${randomLetters}C523617`,
        field955Content1: '$a test field 1',
        field955Content2: '$a test field 2',
        field090Content: '$a test1 $a test 2',
        errorFieldNonRepeatable: 'Fail: Field is non-repeatable.',
        errorSubfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let specId;
      let createdAuthorityId;
      let user;
      let field955Id;

      before('Get bib spec ID and sync spec', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((authSpec) => {
          specId = authSpec.id;
          cy.syncSpecifications(specId);
          toggleAllUndefinedValidationRules(specId, { enable: false });
        });
      });

      after('Delete test data and local field, sync spec', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (field955Id) cy.deleteSpecificationField(field955Id, false);
        cy.syncSpecifications(specId);
      });

      it(
        'C523617 "Help" hyperlink doesn\'t display when error occurs for the field without "Help URL" in MARC authority validation rules (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C523617', 'nonParallel'] },
        () => {
          cy.then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.naturalId,
                '',
                authorityFields,
              ).then((id) => {
                createdAuthorityId = id;
              });
            });
          })
            .then(() => {
              // Create local field 955 as non-repeatable and without "url" key
              cy.getSpecificationFields(specId).then((response) => {
                const existingField955 = findLocalField(response.body.fields, testData.tag955);
                if (existingField955) {
                  cy.deleteSpecificationField(existingField955.id, false);
                }

                const field955Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag955,
                  label: `No_Url_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: false,
                  required: false,
                });

                cy.createSpecificationField(specId, field955Data, false).then((fieldResp) => {
                  field955Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            })
            .then(() => {
              // Step 1: Open Edit pane
              MarcAuthorities.searchBeats(authorityHeading);
              MarcAuthorities.selectAuthorityById(createdAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(authorityHeading);
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Add two 955 fields and one 090 field with duplicate $a
              QuickMarcEditor.addNewField(
                testData.tag955,
                testData.field955Content1,
                tag100rowIndex,
              );
              QuickMarcEditor.verifyTagValue(tag100rowIndex + 1, testData.tag955);
              QuickMarcEditor.checkContent(testData.field955Content1, tag100rowIndex + 1);

              QuickMarcEditor.addNewField(
                testData.tag955,
                testData.field955Content2,
                tag100rowIndex + 1,
              );
              QuickMarcEditor.verifyTagValue(tag100rowIndex + 2, testData.tag955);
              QuickMarcEditor.checkContent(testData.field955Content2, tag100rowIndex + 2);

              QuickMarcEditor.addNewField(
                testData.tag090,
                testData.field090Content,
                tag100rowIndex + 2,
              );
              QuickMarcEditor.verifyTagValue(tag100rowIndex + 3, testData.tag090);
              QuickMarcEditor.checkContent(testData.field090Content, tag100rowIndex + 3);

              // Step 3: Click "Save & close" and verify errors without "Help" links
              QuickMarcEditor.pressSaveAndCloseButton();

              // Verify non-repeatable error for second 955 field
              QuickMarcEditor.checkErrorMessage(
                tag100rowIndex + 2,
                testData.errorFieldNonRepeatable,
              );
              // Verify "Help" link is NOT shown for 955 error
              QuickMarcEditor.checkErrorMessage(tag100rowIndex + 2, 'Help', false);

              // Verify non-repeatable subfield error for 090 field
              QuickMarcEditor.checkErrorMessage(
                tag100rowIndex + 3,
                testData.errorSubfieldANonRepeatable,
              );
              // Verify "Help" link is NOT shown for 090 error
              QuickMarcEditor.checkErrorMessage(tag100rowIndex + 3, 'Help', false);
            });
        },
      );
    });
  });
});
