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
        tag400: '400',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514983`,
        field100Content: `$a AT_C514983_MarcAuthority_${randomPostfix}`,
        field100Ind1: '1',
        field100Ind2: '\\',
        field400Content1: '$a Repeatable reference 1',
        field400Content2: '$a Repeatable reference 2',
        localNotRepeatableFieldTag: '980',
        localRepeatableFieldTag: '981',
        field980Content: '$a Not-repeatable local',
        field981Content1: '$a Repeatable local 1st',
        field981Content2: '$a Repeatable local 2nd',
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
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (localField980Id) cy.deleteSpecificationField(localField980Id, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);
        cy.syncSpecifications(authSpecId);
        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514983 Create MARC authority record with not-repeatable / multiple repeatable fields (Standard and Local) (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514983'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514983_');
          })
            .then(() => {
              // Create not-repeatable local field 980
              cy.deleteSpecificationFieldByTag(
                authSpecId,
                testData.localNotRepeatableFieldTag,
                false,
              );
              cy.createSpecificationField(authSpecId, {
                tag: testData.localNotRepeatableFieldTag,
                label: `AT_C514983_Local_Field_980_${randomPostfix}`,
                repeatable: false,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField980Id = fieldResp.body.id;
              });

              // Create repeatable local field 981
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localRepeatableFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localRepeatableFieldTag,
                label: `AT_C514983_Local_Field_981_${randomPostfix}`,
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

              // Step 6: Add repeatable/not-repeatable fields.
              // Order of additions achieves final row sequence: 400(ref1), 400(ref2), 980, 981(1st), 981(2nd)
              // First add 400(ref1), then 980 and 981 after it while only one 400 exists,
              // then insert 400(ref2) after the first 400 (pushing 980/981 down),
              // then insert 981(2nd) after the first 981.
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.tag400,
                testData.field400Content1,
              );
              QuickMarcEditor.checkContentByTag(testData.tag400, testData.field400Content1);

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag400,
                testData.localNotRepeatableFieldTag,
                testData.field980Content,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localNotRepeatableFieldTag,
                testData.field980Content,
              );

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.localNotRepeatableFieldTag,
                testData.localRepeatableFieldTag,
                testData.field981Content1,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localRepeatableFieldTag,
                testData.field981Content1,
              );

              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag400,
                testData.tag400,
                testData.field400Content2,
              );
              QuickMarcEditor.checkContent(testData.field400Content2, 7);

              cy.wait(1000);
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.localRepeatableFieldTag,
                testData.localRepeatableFieldTag,
                testData.field981Content2,
              );
              QuickMarcEditor.checkContent(testData.field981Content2, 10);

              // Step 7: Save & close → success toast; detail view pane opens with all fields
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
              MarcAuthority.contains(testData.field400Content1);
              MarcAuthority.contains(testData.field400Content2);
              MarcAuthority.contains(testData.field980Content);
              MarcAuthority.contains(testData.field981Content1);
              MarcAuthority.contains(testData.field981Content2);
            });
        },
      );
    });
  });
});
