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
      const tag002 = '002';
      const tag003 = '003';
      const tag004 = '004';
      const tag009 = '009';
      const tag010 = '010';
      const tag014 = '014';
      const tag035 = '035';
      const tag110 = '110';
      const tag410 = '410';
      const tag510 = '510';
      const tag670 = '670';
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      // 'n' prefix matches LCNAF authority file format
      const naturalId = `n${randomNDigitNumber(15)}440077`;
      const authorityHeading = `AT_C440077_MarcAuthority_${randomPostfix}`;

      // After adding all 12 fields then reordering (row 16 = 999):
      // LDR(0), 001(1), 005(2), 008(3), 002(4), 003(5), 004(6), 009(7), 010(8),
      // 014(9), 035(10), 110(11), 410(12), 410(13), 510(14), 670(15), 999(16)
      // Target: LDR, 001, 005, 670, 510, 410, 410, 110, 035, 014, 010, 009, 008, 004, 003, 002, 999
      const expectedTagsOrderInEditor = [
        'LDR',
        '001',
        '005',
        '670',
        '510',
        '410',
        '410',
        '110',
        '035',
        '014',
        '010',
        '009',
        '008',
        '004',
        '003',
        '002',
        '999',
      ];
      const expectedTagsOrderInDetailView = [
        'LEADER',
        '001',
        '005',
        '670',
        '510',
        '410',
        '410',
        '110',
        '035',
        '014',
        '010',
        '009',
        '008',
        '004',
        '003',
        '002',
        '999',
      ];

      let user;
      let createdAuthorityId;

      before('Create user, activate authority file', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C440077_');
        ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFile);

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
        'C440077 Verify that all fields (except "LDR", "005, "999") can be moved and saved when creating "MARC authority" record (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C440077'] },
        () => {
          // Step 1: Open form; verify LDR/001/005/008/999 have no move arrows initially
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          [0, 1, 2, 4].forEach((rowIndex) => {
            QuickMarcEditor.verifyEditableFieldIcons(rowIndex, false, false, false, false);
          });
          QuickMarcEditor.verifyEditableFieldIcons(3, false, false, false, true);

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tag008, false);

          // Step 3: Select FOLIO authority file
          MarcAuthority.selectSourceFile(folioAuthFile);
          MarcAuthority.verifySourceFileSelected(folioAuthFile);

          // Step 4: Add 12 fields in order after 008
          // Initial: LDR(0),001(1),005(2),008(3),999(4)
          QuickMarcEditor.addNewField(tag002, '$a Value002', 3);
          QuickMarcEditor.checkContentByTag(tag002, '$a Value002');
          QuickMarcEditor.addNewField(tag003, '$a Value003', 4);
          QuickMarcEditor.checkContentByTag(tag003, '$a Value003');
          QuickMarcEditor.addNewField(tag004, '$a Value004', 5);
          QuickMarcEditor.checkContentByTag(tag004, '$a Value004');
          QuickMarcEditor.addNewField(tag009, '$a Value009', 6);
          QuickMarcEditor.checkContentByTag(tag009, '$a Value009');
          QuickMarcEditor.addNewField(tag010, `$a ${naturalId}`, 7);
          QuickMarcEditor.checkContentByTag(tag010, `$a ${naturalId}`);
          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag014, '$a test 014');
          QuickMarcEditor.checkContentByTag(tag014, '$a test 014');
          MarcAuthority.addNewFieldAfterExistingByTag(tag014, tag035, '$a test 035');
          QuickMarcEditor.checkContentByTag(tag035, '$a test 035');
          MarcAuthority.addNewFieldAfterExistingByTag(tag035, tag110, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag110, `$a ${authorityHeading}`);
          // first 410 after 110 → row 12
          MarcAuthority.addNewFieldAfterExistingByTag(
            tag110,
            tag410,
            '$a Fields order test, create authority',
          );
          QuickMarcEditor.checkContentByTag(tag410, '$a Fields order test, create authority');
          // second 410 after first 410 (tag match finds first → inserts at row 13)
          MarcAuthority.addNewFieldAfterExistingByTag(
            tag410,
            tag410,
            '$a Fields order test, create authority 2nd row',
          );
          // 510 and 670 use addNewField with explicit row index to avoid tag ambiguity with second 410
          MarcAuthority.addNewField(13, tag510, '$a Fields order test, create authority');
          QuickMarcEditor.checkContentByTag(tag510, '$a Fields order test, create authority');
          MarcAuthority.addNewField(14, tag670, '$a 670 field value');
          QuickMarcEditor.checkContentByTag(tag670, '$a 670 field value');
          // State: LDR(0),001(1),005(2),008(3),002(4),003(5),004(6),009(7),010(8),
          //        014(9),035(10),110(11),410(12),410(13),510(14),670(15),999(16)

          // Verify 008 has only down arrow (can't move up past 005) and 670 has only up arrow
          QuickMarcEditor.verifyEditableFieldIcons(3, false, true, false, true);
          QuickMarcEditor.verifyEditableFieldIcons(15, true, false, true, true);

          // Step 5: Reorder all fields to descending tag order
          // Target: LDR,001,005,670,510,410,410,110,035,014,010,009,008,004,003,002,999

          // Move 670 from row 15 up to row 3 (12 moves)
          QuickMarcEditor.verifyTagValue(15, tag670);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag670);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag670);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag670);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag670);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag670);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag670);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag670);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag670);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag670);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag670);
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyTagValue(4, tag670);
          QuickMarcEditor.moveFieldUp(4);
          QuickMarcEditor.verifyTagValue(3, tag670);

          // Move 510 from row 15 up to row 4 (11 moves)
          QuickMarcEditor.verifyTagValue(15, tag510);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag510);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag510);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag510);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag510);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag510);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag510);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag510);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag510);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag510);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag510);
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyTagValue(4, tag510);

          // Move second 410 from row 15 up to row 5 (10 moves)
          QuickMarcEditor.verifyTagValue(15, tag410);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag410);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag410);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag410);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag410);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag410);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag410);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag410);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag410);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag410);
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, tag410);

          // Move first 410 from row 15 up to row 6 (9 moves)
          QuickMarcEditor.verifyTagValue(15, tag410);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag410);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag410);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag410);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag410);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag410);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag410);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag410);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag410);
          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, tag410);

          // Move 110 from row 15 up to row 7 (8 moves)
          QuickMarcEditor.verifyTagValue(15, tag110);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag110);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag110);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag110);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag110);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag110);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag110);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag110);
          QuickMarcEditor.moveFieldUp(8);
          QuickMarcEditor.verifyTagValue(7, tag110);

          // Move 035 from row 15 up to row 8 (7 moves)
          QuickMarcEditor.verifyTagValue(15, tag035);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag035);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag035);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag035);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag035);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag035);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag035);
          QuickMarcEditor.moveFieldUp(9);
          QuickMarcEditor.verifyTagValue(8, tag035);

          // Move 014 from row 15 up to row 9 (6 moves)
          QuickMarcEditor.verifyTagValue(15, tag014);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag014);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag014);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag014);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag014);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag014);
          QuickMarcEditor.moveFieldUp(10);
          QuickMarcEditor.verifyTagValue(9, tag014);

          // Move 010 from row 15 up to row 10 (5 moves)
          QuickMarcEditor.verifyTagValue(15, tag010);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag010);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag010);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag010);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag010);
          QuickMarcEditor.moveFieldUp(11);
          QuickMarcEditor.verifyTagValue(10, tag010);

          // Move 009 from row 15 up to row 11 (4 moves)
          QuickMarcEditor.verifyTagValue(15, tag009);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag009);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag009);
          QuickMarcEditor.moveFieldUp(13);
          QuickMarcEditor.verifyTagValue(12, tag009);
          QuickMarcEditor.moveFieldUp(12);
          QuickMarcEditor.verifyTagValue(11, tag009);

          // Rows 13–15 are now [002, 003, 004]; reverse them to [004, 003, 002]
          // Move 004 from row 15 up 2 positions
          QuickMarcEditor.verifyTagValue(15, tag004);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag004);
          QuickMarcEditor.moveFieldUp(14);
          QuickMarcEditor.verifyTagValue(13, tag004);
          // Move 003 from row 15 up 1 position
          QuickMarcEditor.verifyTagValue(15, tag003);
          QuickMarcEditor.moveFieldUp(15);
          QuickMarcEditor.verifyTagValue(14, tag003);

          QuickMarcEditor.verifyRowOrderByTags(expectedTagsOrderInEditor);

          // Step 6: Save & close; verify detail view field order
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
          });
          MarcAuthority.verifyFieldsOrder(expectedTagsOrderInDetailView);

          // Step 7: Open edit; verify same field order in editor
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyRowOrderByTags(expectedTagsOrderInEditor);
        },
      );
    });
  });
});
