import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tag008 = '008';
      const tag010 = '010';
      const tag014 = '014';
      const tag035 = '035';
      const tag100 = '100';
      const tag400 = '400';
      const tag500 = '500';
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      // 'n' prefix matches LCNAF authority file format
      const naturalId = `n${randomNDigitNumber(15)}423556`;
      const authorityHeading = `AT_C423556_MarcAuthority_${randomPostfix}`;

      const expectedTagsOrderInEditor = [
        'LDR',
        '001',
        '005',
        '500',
        '400',
        '100',
        '035',
        '010',
        '008',
        '999',
      ];
      const expectedTagsOrderInDetailView = [
        'LEADER',
        '001',
        '005',
        '500',
        '400',
        '100',
        '035',
        '010',
        '008',
        '999',
      ];

      let user;
      let createdAuthorityId;

      before('Create user, activate authority file', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423556_');
        ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFile);

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user?.userId);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
      });

      it(
        'C423556 Move and delete actions in "Create a new MARC authority record" window (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C423556'] },
        () => {
          // Steps 1-2: Open form, set valid 008 values
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tag008, false);

          // Step 3: Select FOLIO authority file
          MarcAuthority.selectSourceFile(folioAuthFile);
          MarcAuthority.verifySourceFileSelected(folioAuthFile);

          // Step 4: Add 6 fields in order: 010, 014, 035, 100, 400, 500
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, `$a ${naturalId}`);
          QuickMarcEditor.checkContentByTag(tag010, `$a ${naturalId}`);

          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag014, '$a 333444777');
          QuickMarcEditor.checkContentByTag(tag014, '$a 333444777');

          MarcAuthority.addNewFieldAfterExistingByTag(tag014, tag035, '$a 345231');
          QuickMarcEditor.checkContentByTag(tag035, '$a 345231');

          MarcAuthority.addNewFieldAfterExistingByTag(
            tag035,
            tag100,
            `$a ${authorityHeading}`,
            '1',
            '\\',
          );
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          MarcAuthority.addNewFieldAfterExistingByTag(
            tag100,
            tag400,
            '$a Move fields using actions test',
            '\\',
            '1',
          );
          QuickMarcEditor.checkContentByTag(tag400, '$a Move fields using actions test');

          MarcAuthority.addNewFieldAfterExistingByTag(
            tag400,
            tag500,
            '$a Delete fields using actions test',
            '\\',
            '1',
          );
          QuickMarcEditor.checkContentByTag(tag500, '$a Delete fields using actions test');

          // Step 5: Delete 014 field
          // Fields before delete: LDR(0), 001(1), 005(2), 008(3), 010(4), 014(5), 035(6), 100(7), 400(8), 500(9), 999(10)
          QuickMarcEditor.deleteFieldByTagAndCheck(tag014);

          // Step 6: Reorder fields to descending order.
          // After delete: LDR(0), 001(1), 005(2), 008(3), 010(4), 035(5), 100(6), 400(7), 500(8), 999(9)
          // Target:       LDR(0), 001(1), 005(2), 500(3), 400(4), 100(5), 035(6), 010(7), 008(8), 999(9)
          // Move 500 from row 8 up to row 3 (5 moves)
          QuickMarcEditor.verifyTagValue(8, tag500);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag500);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag500);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag500);
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyTagValue(4, tag500);
          QuickMarcEditor.moveFieldUp(4);
          QuickMarcEditor.verifyTagValue(3, tag500);
          // Move 400 from row 8 up to row 4 (4 moves)
          QuickMarcEditor.verifyTagValue(8, tag400);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag400);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag400);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag400);
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyTagValue(4, tag400);
          // Move 100 from row 8 up to row 5 (3 moves)
          QuickMarcEditor.verifyTagValue(8, tag100);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag100);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag100);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag100);
          // Move 035 from row 8 up to row 6 (2 moves)
          QuickMarcEditor.verifyTagValue(8, tag035);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag035);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag035);
          // Move 010 from row 8 up to row 7 (1 move)
          QuickMarcEditor.moveFieldUp(8);

          QuickMarcEditor.verifyRowOrderByTags(expectedTagsOrderInEditor);

          // Step 7: Save & close; verify detail view shows same descending field order
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
          });
          MarcAuthority.verifyFieldsOrder(expectedTagsOrderInDetailView);
        },
      );
    });
  });
});
