import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../../support/constants';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          tag100: '100',
          tag245: '245',
          tag600: '600',
          tag700: '700',
          instanceTitle: `AT_C410754_MarcBibInstance_${randomPostfix}`,
          authorityTitleShared: `AT_C410754_MarcAuthority_${randomPostfix}_Shared`,
          authorityTitleLocal: `AT_C410754_MarcAuthority_${randomPostfix}_Local`,
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          marcAuthIcon: 'Linked to MARC authority',
          sharedLink: 'Shared',
          contributorAccordion: 'Contributor',
          subjectAccordion: 'Subject',
          subjectBrowseOption: 'Subjects',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const authorityFieldsShared = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityTitleShared}`,
            indicators: ['\\', '\\'],
          },
        ];

        const authorityFieldsLocal = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityTitleLocal}`,
            indicators: ['\\', '\\'],
          },
        ];

        const linkedFieldsData = [
          {
            tag: testData.tag600,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a ${testData.authorityTitleShared}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          },
          {
            tag: testData.tag700,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a ${testData.authorityTitleLocal}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${+authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: '',
          },
        ];

        let createdInstanceId;
        let createdAuthorityIdCentral;
        let createdAuthorityIdLocal;
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410754_MarcAuthority');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ])
            .then((userProperties) => {
              user = userProperties;

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFieldsShared,
              ).then((createdRecordId) => {
                createdAuthorityIdCentral = createdRecordId;
              });
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410754_MarcAuthority');

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                `${+authData.startWithNumber + 1}`,
                authorityFieldsLocal,
              ).then((createdRecordId) => {
                createdAuthorityIdLocal = createdRecordId;
              });
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityIdCentral, true);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(createdAuthorityIdLocal, true);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        });

        it(
          'C410754 Link Local MARC bib with Shared/Local MARC auth on Member tenant in Create screen (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C410754'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
            QuickMarcEditor.updateLDR06And07Positions();

            MarcAuthority.addNewField(4, testData.tag600, `$a ${testData.authorityTitleShared}`);
            MarcAuthority.addNewField(5, testData.tag700, `$a ${testData.authorityTitleLocal}`);

            InventoryInstance.verifyAndClickLinkIcon(testData.tag600);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);
            MarcAuthorities.checkRow(`${testData.sharedLink}${testData.authorityTitleShared}`);
            MarcAuthorities.selectIncludingTitle(testData.authorityTitleShared);
            MarcAuthority.waitLoading();
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldsData[0]));
            QuickMarcEditor.closeAllCallouts();

            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);
            MarcAuthorities.checkRow(testData.authorityTitleLocal);
            MarcAuthorities.selectIncludingTitle(testData.authorityTitleLocal);
            MarcAuthority.waitLoading();
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldsData[1]));
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdInstanceId = id;
            });
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.contributorAccordion,
              `${testData.marcAuthIcon}\n${testData.authorityTitleLocal}`,
            );
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.subjectAccordion,
              `${testData.marcAuthIcon}\n${testData.authorityTitleShared}`,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.selectBrowseOption(testData.subjectBrowseOption);
            InventorySearchAndFilter.browseSearch(testData.authorityTitleShared);
            BrowseSubjects.verifyNonExistentSearchResult(testData.authorityTitleShared);

            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBeats(testData.authorityTitleShared);
            MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.authorityTitleShared);
          },
        );
      });
    });
  });
});
