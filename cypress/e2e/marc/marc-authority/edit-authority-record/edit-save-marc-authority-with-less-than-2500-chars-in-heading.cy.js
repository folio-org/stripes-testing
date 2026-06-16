import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const field001prefix = `1${getRandomLetters(14)}422092`;
      const commonSearchPrefix = `AT_C422092_MarcAuthority_${randomPostfix}`;

      const makeHeading = (tag) => {
        const prefix = `${commonSearchPrefix}_${tag}`;
        return prefix + 'a'.repeat(2500 - prefix.length);
      };

      const testRecords = [
        { tag: '100' },
        { tag: '110' },
        { tag: '111' },
        { tag: '130' },
        { tag: '150' },
        { tag: '151' },
        { tag: '155' },
      ];

      let userProperties;

      before('Create user, data', () => {
        cy.getAdminToken();

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422092_');

        testRecords.forEach((record, index) => {
          const heading = makeHeading(record.tag);
          MarcAuthorities.createMarcAuthorityViaAPI(
            '',
            `${field001prefix}${randomNDigitNumber(3)}${index}`,
            [
              {
                tag: record.tag,
                content: `$a ${heading}`,
                indicators: ['\\', '\\'],
              },
            ],
          ).then((id) => {
            record.id = id;
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('Cleanup', () => {
        cy.getAdminToken();
        testRecords.forEach((record) => {
          if (record.id) MarcAuthority.deleteViaAPI(record.id, true);
        });
        if (userProperties) Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C422092 User can edit and save "MARC authority" with less than 2500 characters in heading (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422092'] },
        () => {
          MarcAuthorities.searchBeats(commonSearchPrefix);
          MarcAuthorities.checkRowsCount(testRecords.length);

          // Steps 1-13: records 100-151 — delete one char from 1XX field, Save & keep editing
          testRecords.slice(0, 6).forEach((record) => {
            const heading = makeHeading(record.tag);
            const trimmedHeading = heading.slice(0, -1);

            MarcAuthorities.selectAuthorityById(record.id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(heading);

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField(record.tag, `$a ${trimmedHeading}`);
            QuickMarcEditor.checkContentByTag(record.tag, `$a ${trimmedHeading}`);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkContentByTag(record.tag, `$a ${trimmedHeading}`);
            QuickMarcEditor.checkButtonsDisabled();

            QuickMarcEditor.closeAuthorityEditorPane();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(trimmedHeading);
            MarcAuthority.closeAuthorityViewPane();
          });

          // Steps 14-16: record 155 — delete one char from 1XX field, Save & keep editing
          const lastRecord = testRecords[6];
          const lastHeading = makeHeading(lastRecord.tag);
          const lastTrimmedHeading = lastHeading.slice(0, -1);

          MarcAuthorities.selectAuthorityById(lastRecord.id);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(lastHeading);

          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(lastRecord.tag, `$a ${lastTrimmedHeading}`);
          QuickMarcEditor.checkContentByTag(lastRecord.tag, `$a ${lastTrimmedHeading}`);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkContentByTag(lastRecord.tag, `$a ${lastTrimmedHeading}`);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.closeAuthorityEditorPane();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(lastTrimmedHeading);
        },
      );
    });
  });
});
