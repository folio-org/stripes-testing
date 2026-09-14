import Permissions from '../../../../support/dictionary/permissions';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
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

      // 010 $a with no letter prefix, per the precondition - $0 of the linked bib field cannot
      // resolve to a source file until a valid (letter-prefixed) natural id is set
      const naturalId = `${randomDigits}422056`;
      const prefixedNaturalId = `n${randomDigits}422056`;
      const authorityHeading = `AT_C422056_MarcAuthority_${randomPostfix}`;
      const updatedAuthorityHeading = `AT_C422056_MarcAuthority_${randomPostfix} Updated`;
      const bibTitle = `AT_C422056_MarcBibInstance_${randomPostfix}`;
      const ldrRegExp = /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });

      const originalField010 = { indicators: ['\\', '\\'], content: `$a ${naturalId}` };
      const updatedField010 = { indicators: ['\\', '\\'], content: `$a ${prefixedNaturalId}` };
      const originalField100 = { indicators: ['1', '\\'], content: `$a ${authorityHeading}` };
      const updatedField100 = { indicators: ['1', '\\'], content: `$a ${updatedAuthorityHeading}` };

      // Renders a field the same way "Changed from/to" text is displayed: indicators (blank ->
      // single space) followed by a separator space, then the raw "$a foo $b bar" content
      const fieldDisplay = ({ indicators, content }) => {
        const indicatorChar = (indicator) => (indicator === '\\' ? ' ' : indicator);
        return `${indicatorChar(indicators[0])}${indicatorChar(indicators[1])} ${content}`;
      };

      const changesModalData = [
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '010',
          from: fieldDisplay(originalField010),
          to: fieldDisplay(updatedField010),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '100',
          from: fieldDisplay(originalField100),
          to: fieldDisplay(updatedField100),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: 'LDR',
          from: ldrRegExp,
          to: ldrRegExp,
        },
      ];

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
      ];

      let user;
      let authorityId;
      let bibId;

      before('Create test data, link records, login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422056_MarcAuthority');

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            {
              tag: '010',
              content: originalField010.content,
              indicators: originalField010.indicators,
            },
            {
              tag: '100',
              content: originalField100.content,
              indicators: originalField100.indicators,
            },
          ]).then((id) => {
            authorityId = id;
          });

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
            { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
            { tag: '100', content: '$a placeholder', indicators: ['1', '\\'] },
          ]).then((id) => {
            bibId = id;
          });

          cy.then(() => {
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId,
              authorityIds: [authorityId],
              bibFieldTags: ['100'],
              authorityFieldTags: ['100'],
              finalBibFieldContents: [`$a ${authorityHeading}`],
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user?.userId);
        if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
        if (bibId) InventoryInstance.deleteInstanceViaApi(bibId);
      });

      it(
        'C422056 Edit "010" value (add valid prefix to $a) of linked "MARC authority" record when "001" controls "$0" of MARC bib\'s field and check "Version history" (promin)',
        { tags: ['extendedPath', 'promin', 'C422056'] },
        () => {
          // Steps 1-3: Search for the authority record and open its detail view
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, authorityHeading);
          MarcAuthorities.selectTitle(authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeading);

          // Steps 4-5: Edit the record - add a valid letter prefix to "010" $a, update "100" $a
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('010', updatedField010.content);
          QuickMarcEditor.updateExistingField('100', updatedField100.content);

          // Step 6: Save & close
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyLinkedBibUpdatesCallout(1);
          MarcAuthority.contains(updatedAuthorityHeading);

          // Step 7: Open "Version history" - verify counter and the first card's "Changed" bullets
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(2);
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
            'Field 010',
            VersionHistorySection.fieldActions.EDITED,
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
          VersionHistorySection.checkChangesCountForCard(0, changesModalData.length);

          // Step 8: Open the "Changed" modal and verify every field-level change
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(date, user.firstName, user.lastName);
          changesModalData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalData.length);

          // Step 9: Close the modal and the detail view - re-search to refresh the results list
          VersionHistorySection.closeChangesModal();
          MarcAuthority.closeAuthorityViewPane();
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, updatedAuthorityHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(updatedAuthorityHeading, '1');

          // Step 10: Click the "Number of titles" link - opens the linked instance in Inventory
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventorySearchAndFilter.verifySearchResult(bibTitle);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkPresentedText(bibTitle);

          // Step 11: Verify the linked "100" field now carries the updated $0 (based on the
          // newly-valid, letter-prefixed natural id) and keeps the controlled/uncontrolled order
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            '100',
            '1',
            '\\',
            `$a ${updatedAuthorityHeading}`,
            '',
            `$0 ${lcNameAuthorityFileBaseUrl}${prefixedNaturalId}`,
            '',
          );
        },
      );
    });
  });
});
