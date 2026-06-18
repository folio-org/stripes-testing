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
        tag010: '010',
        tag400: '400',
        tag980: '980',
        tag981: '981',
        authorityHeading: `AT_C514985_MarcAuthority_${randomPostfix}`,
        field100UpdatedContent: `$a AT_C514985_MarcAuthority_${randomPostfix} test`,
        field400Content1: '$a Repeatable reference 1',
        field400Content2: '$a Repeatable reference 2',
        field980Content: '$a Not-repeatable local',
        field981Content1: '$a Repeatable local 1st',
        field981Content2: '$a Repeatable local 2nd',
        naturalId: `${randomLetters}C514985`,
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
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

        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514985 Edit MARC authority record with not-repeatable / multiple repeatable fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514985'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514985_');
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            // Create local not-repeatable field 980
            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag980, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag980,
              label: `AT_C514985_LocalField_980_${randomPostfix}`,
              repeatable: false,
              required: false,
              deprecated: false,
            }).then((resp) => {
              localField980Id = resp.body.id;
            });

            // Create local repeatable field 981
            cy.deleteSpecificationFieldByTag(authSpecId, testData.tag981, false);
            cy.createSpecificationField(authSpecId, {
              tag: testData.tag981,
              label: `AT_C514985_LocalField_981_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
            }).then((resp) => {
              localField981Id = resp.body.id;
            });

            cy.syncSpecifications(authSpecId);

            MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', [
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
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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

              // Step 2: Update 1XX field
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field100UpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100UpdatedContent);

              // Step 3: Add not-repeatable (010, 980) and repeatable (400×2, 981×2) fields
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              QuickMarcEditor.addEmptyFields(6);
              QuickMarcEditor.checkEmptyFieldAdded(7);
              QuickMarcEditor.addValuesToExistingField(
                6,
                testData.tag400,
                testData.field400Content1,
              );
              QuickMarcEditor.checkContent(testData.field400Content1, 7);

              QuickMarcEditor.addEmptyFields(7);
              QuickMarcEditor.checkEmptyFieldAdded(8);
              QuickMarcEditor.addValuesToExistingField(
                7,
                testData.tag400,
                testData.field400Content2,
              );
              QuickMarcEditor.checkContent(testData.field400Content2, 8);

              QuickMarcEditor.addEmptyFields(8);
              QuickMarcEditor.checkEmptyFieldAdded(9);
              QuickMarcEditor.addValuesToExistingField(
                8,
                testData.tag980,
                testData.field980Content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag980, testData.field980Content);

              QuickMarcEditor.addEmptyFields(9);
              QuickMarcEditor.checkEmptyFieldAdded(10);
              QuickMarcEditor.addValuesToExistingField(
                9,
                testData.tag981,
                testData.field981Content1,
              );
              QuickMarcEditor.checkContent(testData.field981Content1, 10);

              QuickMarcEditor.addEmptyFields(10);
              QuickMarcEditor.checkEmptyFieldAdded(11);
              QuickMarcEditor.addValuesToExistingField(
                10,
                testData.tag981,
                testData.field981Content2,
              );
              QuickMarcEditor.checkContent(testData.field981Content2, 11);

              // Step 4: Save & close (ignore warn errors) → success notification, detail view opens
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.verifyAfterSaveAndClose();
              MarcAuthority.contains(testData.field100UpdatedContent);
            });
        },
      );
    });
  });
});
