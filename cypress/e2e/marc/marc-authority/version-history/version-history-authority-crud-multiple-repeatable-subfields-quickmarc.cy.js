import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import TopMenu from '../../../../support/fragments/topMenu';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const authHeadingPrefix = 'C663318_Elizabeth';
      const testData = {
        authorityHeading: `${authHeadingPrefix} II, Queen of Great Britain, 1926-`,
        searchOption: 'Keyword',
        tag100: '100',
        tagLDR: 'LDR',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        ldrRegExp: /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/,
        step2Content: '$a Elizabeth $b II, $c Queen of Great Britain, $d 1926- $c -2021 $c date',
        step3Content: '$a Elizabeth $b II, $c Queen of GB, $d 1926- $c 2022 $c date',
        step4Content: '$a Elizabeth $b II, $c Queen of GB, $d 1926-',
        originalContent: '$a C663318_Elizabeth $b II, $c Queen of Great Britain, $d 1926-',
      };

      const authData = {
        prefix: getRandomLetters(5),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: '100',
          content: '$a C663318_Elizabeth $b II, $c Queen of Great Britain, $d 1926-',
          indicators: ['0', '\\'],
        },
      ];

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C663318_Elizabeth*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663318 Check "Version history" pane after Create, Update, Delete multiple repeatable subfields in "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663318'] },
        () => {
          // Step 1: Open Edit MARC authority record pane
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
          MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 2: Add multiple repeatable subfields in 100 field ($c -2021 $c date) and Save & keep editing
          QuickMarcEditor.updateExistingField(testData.tag100, testData.step2Content);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          cy.wait(1000);

          // Step 3: Edit multiple repeatable subfields in 100 field and Save & keep editing
          QuickMarcEditor.updateExistingField(testData.tag100, testData.step3Content);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          // Step 4: Delete multiple repeatable subfields ($c 2022 $c date) and Save & close
          cy.wait(3000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.step4Content);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          InteractorsTools.closeAllVisibleCallouts();
          MarcAuthority.waitLoading();

          // Step 5: Open Version history pane and verify 4 versions are displayed
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(4);

          // Verify first card (most recent - delete repeatable subfields)
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 100',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Verify second card (edit repeatable subfields)
          VersionHistorySection.verifyVersionHistoryCard(
            1,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            false,
          );
          VersionHistorySection.checkChangeForCard(
            1,
            'Field 100',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            1,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Verify third card (add repeatable subfields)
          VersionHistorySection.verifyVersionHistoryCard(
            2,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            false,
          );
          VersionHistorySection.checkChangeForCard(
            2,
            'Field 100',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            2,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Step 6: Click "Changed" on first card and verify modal
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            '100',
            `0  ${testData.step3Content}`,
            `0  ${testData.step4Content}`,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'LDR',
            testData.ldrRegExp,
            testData.ldrRegExp,
          );
          VersionHistorySection.checkChangesCountInModal(2);

          // Step 7: Close modal
          VersionHistorySection.closeChangesModal(true);
          VersionHistorySection.waitLoading();

          // Step 8: Click "Changed" on second card and verify modal
          VersionHistorySection.openChangesForCard(1);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            '100',
            `0  ${testData.step2Content}`,
            `0  ${testData.step3Content}`,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'LDR',
            testData.ldrRegExp,
            testData.ldrRegExp,
          );
          VersionHistorySection.checkChangesCountInModal(2);

          // Step 9: Close modal
          VersionHistorySection.closeChangesModal(false);
          VersionHistorySection.waitLoading();

          // Step 10: Click "Changed" on third card and verify modal
          VersionHistorySection.openChangesForCard(2);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            '100',
            `0  ${testData.originalContent}`,
            `0  ${testData.step2Content}`,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'LDR',
            testData.ldrRegExp,
            testData.ldrRegExp,
          );
          VersionHistorySection.checkChangesCountInModal(2);

          VersionHistorySection.closeChangesModal(false);
          VersionHistorySection.waitLoading();
        },
      );
    });
  });
});
