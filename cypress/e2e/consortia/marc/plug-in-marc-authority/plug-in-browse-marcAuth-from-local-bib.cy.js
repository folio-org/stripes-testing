import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Affiliations from '../../../../support/dictionary/affiliations';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag400: '400',
        tag800: '800',
        authorityHeadingPrefix: `AT_C404440_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C404440_MarcBibInstance_${randomPostfix}`,
        bibTag800Value: `AT_C404440_Field800_${randomPostfix}`,
        user: {},
        heldByAccordionName: 'Held by',
        naturalIdPrefix: `404440${randomDigits}${randomDigits}`,
        sharedIconText: 'Shared',
        sharedTextInDetailView: 'Shared MARC authority record',
        localTextInDetailView: 'Local MARC authority record',
      };

      const Dropdowns = {
        SHARED: 'Shared',
        YES: 'Yes',
        NO: 'No',
      };

      const authorityHeadings = {
        shared1: `${testData.authorityHeadingPrefix} Central 1 - Authorized`,
        shared2: `${testData.authorityHeadingPrefix} Central 2 - Authorized`,
        college: `${testData.authorityHeadingPrefix} College - Authorized`,
        university: `${testData.authorityHeadingPrefix} University - Authorized`,
        shared1Reference: `${testData.authorityHeadingPrefix} Central 1 - 400 Field`,
        collegeReference: `${testData.authorityHeadingPrefix} College - 400 Field`,
        universityReference: `${testData.authorityHeadingPrefix} University - 400 Field`,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag800,
          content: `$a ${testData.bibTag800Value}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const createdAuthorityIdsCentral = [];
      let createdAuthorityIdCollege;
      let createdAuthorityIdUniversity;
      let createdInstanceId;

      before('Create test data and login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C404440_MarcAuthority');

        cy.setTenant(Affiliations.College);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C404440_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}1`, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.college}`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag400,
              content: `$a ${authorityHeadings.collegeReference}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            createdAuthorityIdCollege = createdRecordId;
          });

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );

          cy.setTenant(Affiliations.University);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C404440_MarcAuthority');

          MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}2`, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.university}`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag400,
              content: `$a ${authorityHeadings.universityReference}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            createdAuthorityIdUniversity = createdRecordId;
          });

          cy.resetTenant();
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]);

          MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}3`, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.shared1}`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag400,
              content: `$a ${authorityHeadings.shared1Reference}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            createdAuthorityIdsCentral.push(createdRecordId);
          });
          MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}4`, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.shared2}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            createdAuthorityIdsCentral.push(createdRecordId);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        createdAuthorityIdsCentral.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        MarcAuthority.deleteViaAPI(createdAuthorityIdCollege, true);
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.University);
        MarcAuthority.deleteViaAPI(createdAuthorityIdUniversity, true);
      });

      it(
        'C404440 Browse for "MARC authority" records in "Select MARC authority" plug-in on Member tenant (from Local "MARC bib") (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C404440'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag800);
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorityBrowse.checkResultWithNoValue(testData.bibTag800Value);

          MarcAuthorities.searchBeats(testData.authorityHeadingPrefix);
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference);

          MarcAuthorities.clickAccordionByName(Dropdowns.SHARED);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.checkRecordsCountExistsInSharedFacet();

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college, false);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference, false);

          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college, false);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference, false);

          MarcAuthorities.selectIncludingTitle(authorityHeadings.shared2);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeadings.shared2);
          MarcAuthorities.checkSharedTextInDetailView();
          MarcAuthority.contains(testData.sharedTextInDetailView);
          MarcAuthorities.closeMarcViewPane();

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college, true);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference, false);

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college, true);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference, false);

          MarcAuthoritiesSearch.unselectExcludeReferencesFilter();
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
            false,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college, true);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference, true);

          MarcAuthorities.selectIncludingTitle(authorityHeadings.college);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeadings.college);
          MarcAuthorities.checkSharedTextInDetailView(false);
          MarcAuthority.contains(testData.localTextInDetailView);
          MarcAuthorities.closeMarcViewPane();

          InventorySearchAndFilter.clearDefaultFilter(Dropdowns.SHARED);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared2}`,
          );
          MarcAuthorities.verifyRecordFound(
            `${testData.sharedIconText}${authorityHeadings.shared1Reference}`,
          );
          MarcAuthorities.verifyRecordFound(authorityHeadings.college);
          MarcAuthorities.verifyRecordFound(authorityHeadings.collegeReference);

          MarcAuthorities.clickNextPaginationButtonIfEnabled().then((clicked) => {
            if (clicked) {
              MarcAuthorities.verifyRecordFound(
                `${testData.sharedIconText}${authorityHeadings.shared1}`,
                false,
              );
              MarcAuthorities.verifyRecordFound(authorityHeadings.college, false);
              MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
              MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
              MarcAuthorities.checkRecordsCountExistsInSharedFacet();
            }
          });
        },
      );
    });
  });
});
