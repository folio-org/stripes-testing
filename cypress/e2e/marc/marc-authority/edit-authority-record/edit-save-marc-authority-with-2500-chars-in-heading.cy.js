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
      const field001prefix = `1${getRandomLetters(14)}422090`;
      const tag500 = '500';
      const commonSearchPrefix = `AT_C422090_MarcAuthority_${randomPostfix}`;

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

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422090_');

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
              {
                tag: tag500,
                content: `$a Original note ${record.tag}`,
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
        'C422090 User can edit and save "MARC authority" with 2500 characters in heading (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422090'] },
        () => {
          MarcAuthorities.searchBeats(commonSearchPrefix);
          MarcAuthorities.checkRowsCount(testRecords.length);

          // Steps 1-13: for records 100, 110, 111, 130, 150, 151 — edit non-1XX field and Save & keep editing
          testRecords.slice(0, 6).forEach((record) => {
            const updatedNote = `$a Updated note ${record.tag}`;

            MarcAuthorities.selectAuthorityById(record.id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(makeHeading(record.tag));

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField(tag500, updatedNote);
            QuickMarcEditor.checkContentByTag(tag500, updatedNote);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkContentByTag(tag500, updatedNote);
            QuickMarcEditor.checkButtonsDisabled();

            QuickMarcEditor.closeAuthorityEditorPane();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(updatedNote);
            MarcAuthority.closeAuthorityViewPane();
          });

          // Steps 14-16: record 155 — edit non-1XX field and Save & close
          const lastRecord = testRecords[6];
          const lastUpdatedNote = `$a Updated note ${lastRecord.tag}`;

          MarcAuthorities.selectAuthorityById(lastRecord.id);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(makeHeading(lastRecord.tag));

          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(tag500, lastUpdatedNote);
          QuickMarcEditor.checkContentByTag(tag500, lastUpdatedNote);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(lastUpdatedNote);
        },
      );
    });
  });
});
