import Permissions from '../../../../support/dictionary/permissions';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      const lcNameAuthorityFileBaseUrl = ManageAuthorityFiles.defaultFolioAuthorityFiles.find(
        (file) => file.name === DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
      ).baseUrl;

      const naturalId = `n${randomDigits}375301`;
      const authorityNamePrefix = `AT_C375301_MarcAuthority_${randomPostfix}`;
      const bibTitle = `AT_C375301_MarcBibInstance_${randomPostfix}`;
      const ldrRegExp = /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });

      // Real-world field shapes provided for the test, with a unique $a for identity/cleanup:
      // authority 100: $a name, $d dates, $t uniform title, $m medium, $n number, $r key
      // bib 240 (controlled): the linked field mirrors the authority's title portion ($t -> $a of
      // 240), then $m/$n/$r verbatim - $a/$d (the personal-name portion) are not part of 240
      const originalField100Content = `$a ${authorityNamePrefix}, $d 1770-1827. $t ${authorityNamePrefix}_SubT, $m piano, violin, cello, $n op. 44, $r E♭ major`;
      const updatedField100Content = `$a ${authorityNamePrefix}, $d 1770-1827. $t ${authorityNamePrefix}_SubT, $m test $n op. 44, $r E♭ major`;

      const field240ContentBeforeLinking = '$a Variations, $m piano. $k Selections';
      const originalField240Content = `$a ${authorityNamePrefix}_SubT, $m piano, violin, cello, $n op. 44, $r E♭ major`;
      const updatedField240Content = `$a ${authorityNamePrefix}_SubT, $m test $n op. 44, $r E♭ major`;

      const permissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      let user;
      let authorityId;
      let bibId;

      before('Create test data, link records, login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375301_MarcAuthority');

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            { tag: '010', content: `$a ${naturalId}`, indicators: ['\\', '\\'] },
            { tag: '100', content: originalField100Content, indicators: ['1', '\\'] },
          ]).then((id) => {
            authorityId = id;
          });

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
            { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
            { tag: '240', content: field240ContentBeforeLinking, indicators: ['1', '0'] },
          ]).then((id) => {
            bibId = id;
          });

          cy.then(() => {
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId,
              authorityIds: [authorityId],
              bibFieldTags: ['240'],
              authorityFieldTags: ['100'],
              finalBibFieldContents: [originalField240Content],
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user?.userId);
        if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
        if (bibId) InventoryInstance.deleteInstanceViaApi(bibId);
      });

      it(
        'C375301 Update "1XX" of linked "MARC authority" record and check order of subfields in MARC bib\'s linked field and "Version history" (promin)',
        { tags: ['extendedPath', 'promin', 'C375301'] },
        () => {
          // Steps 1-3: Search for the authority record and open its detail view
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, authorityNamePrefix);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.waitLoading();

          // Steps 4-5: Edit the record - change the controlled "$m" subfield of "100"
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('100', updatedField100Content);

          // Steps 6-7: Save & close - confirm the linked bib record update
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyLinkedBibUpdatesCallout(1);

          // Step 8: Close the detail view - re-search to refresh the results list
          MarcAuthority.closeAuthorityViewPane();
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, authorityNamePrefix);
          MarcAuthorities.verifyNumberOfTitles(5, '1');

          // Step 9: Click the "Number of titles" link - opens the linked instance in Inventory
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstances.selectInstanceById(bibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkPresentedText(bibTitle);

          // Step 10: Verify the linked "240" field keeps letter-then-digit subfield order and
          // carries the updated "$m" value through from the authority record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            '240',
            '1',
            '0',
            updatedField240Content,
            '',
            `$0 ${lcNameAuthorityFileBaseUrl}${naturalId}`,
            '',
          );
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();

          // Step 11: Open "Version history" - verify counter and the first card's "Changed" bullets
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(3); // original + 2 updates
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            date,
            user.firstName,
            user.lastName,
            false,
            true,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 240',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Step 12: Open the "Changed" modal and verify the field-level change
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(date, user.firstName, user.lastName);
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            '240',
            `10 ${originalField240Content} $0 ${lcNameAuthorityFileBaseUrl}${naturalId} $9 ${authorityId}`,
            `10 ${updatedField240Content} $0 ${lcNameAuthorityFileBaseUrl}${naturalId} $9 ${authorityId}`,
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'LDR',
            ldrRegExp,
            ldrRegExp,
          );
          VersionHistorySection.checkChangesCountInModal(2);
        },
      );
    });
  });
});
