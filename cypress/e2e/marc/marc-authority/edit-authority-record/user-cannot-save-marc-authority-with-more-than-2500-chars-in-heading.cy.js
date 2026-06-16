import { including } from '../../../../../interactors';
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
      const field001prefix = `1${getRandomLetters(14)}422091`;
      const commonSearchPrefix = `AT_C422091_MarcAuthority_${randomPostfix}`;
      const errorCalloutTextPart = 'not saved';

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

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422091_');

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
        'C422091 User cannot save "MARC authority" with more than 2500 characters in heading (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422091'] },
        () => {
          MarcAuthorities.searchBeats(commonSearchPrefix);
          MarcAuthorities.checkRowsCount(testRecords.length);

          // Steps 1-13: records 100-151 — add one char to 1XX (>2500), Save & keep editing → error
          testRecords.slice(0, 6).forEach((record) => {
            const heading = makeHeading(record.tag);
            const extendedContent = `$a ${heading}A`;

            MarcAuthorities.selectAuthorityById(record.id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(heading);

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField(record.tag, extendedContent);
            QuickMarcEditor.checkContentByTag(record.tag, extendedContent);
            QuickMarcEditor.pressSaveAndKeepEditing(errorCalloutTextPart);
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.closeAuthorityEditorPane();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(heading);
            MarcAuthority.closeAuthorityViewPane();
          });

          // Steps 14-16: record 155 — add one char to 1XX (>2500), Save & close → error, editor stays open
          const lastRecord = testRecords[6];
          const lastHeading = makeHeading(lastRecord.tag);
          const lastExtendedContent = `$a ${lastHeading}A`;

          MarcAuthorities.selectAuthorityById(lastRecord.id);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(lastHeading);

          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(lastRecord.tag, lastExtendedContent);
          QuickMarcEditor.checkContentByTag(lastRecord.tag, lastExtendedContent);
          MarcAuthority.clickSaveAndCloseButton();
          QuickMarcEditor.checkCallout(including(errorCalloutTextPart));
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
