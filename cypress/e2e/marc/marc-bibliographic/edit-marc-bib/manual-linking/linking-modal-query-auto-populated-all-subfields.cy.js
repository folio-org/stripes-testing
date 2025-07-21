import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          bibFile: 'marcBibFileC736762.mrc',
          authorityFile: 'marcAuthFileC736762.mrc',
        };
        const randomPostfix = getRandomPostfix();
        const advancedSearchOptionValue = 'advancedSearch';
        const authorityIds = [];
        let user;
        let instanceId;

        const fieldsAndExpectedQueries = [
          {
            tag: '100',
            expected:
              'keyword exactPhrase C736762 Clovio, Giulio, 1498-1578 best coin joy query or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '110',
            expected:
              'keyword exactPhrase C736762 Beatles Subordinate unit Location of meeting - Date of meeting or treaty signing Miscellaneous information Number of part/section/meeting or identifiers.value exactPhrase C73676293094743',
          },
          {
            tag: '111',
            expected:
              'keyword exactPhrase C736762 Stockholm International Film Festival. Location of meeting Date of meeting or treaty signing Subordinate unit Miscellaneous information Number of part/section/meeting Name of meeting following jurisdiction name entry element or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '130',
            expected:
              'keyword exactPhrase C736762 Marvel comics Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '240',
            expected:
              'keyword exactPhrase C736762 PASS (editable) test fail fail fail fail fail fail fail fail fail fail fail or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '600',
            expected:
              'keyword exactPhrase C736762 Black Panther Numeration (Fictitious character) second title Dates associated with a name Miscellaneous information Attribution qualifier Fuller form of name Date of a work Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Wakanda Forever or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '610',
            expected:
              'keyword exactPhrase C736762 Radio Roma. Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '611',
            expected:
              'keyword exactPhrase C736762 Roma Council Location of meeting Date Subordinate unit Date of a work Inf Medium Form subheading Language of a work Nou Name of meeting following jurisdiction name entry element Name of part/section of a work Version Title of a work or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '630',
            expected:
              'keyword exactPhrase C736762 Marvel comics Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '650',
            expected:
              'keyword exactPhrase C736762 Speaking Oratory debating Miscellaneous information or identifiers.value exactPhrase shC73676285095298',
          },
          {
            tag: '651',
            expected:
              'keyword exactPhrase C736762 Clear Creek (Tex.) Place in Texas or identifiers.value exactPhrase nC73676279041363',
          },
          {
            tag: '655',
            expected:
              'keyword exactPhrase C736762 Drama or identifiers.value exactPhrase gfC7367622014026297',
          },
          {
            tag: '700',
            expected:
              'keyword exactPhrase C736762 BP Numeration (Fictitious) Dates Date information Medium qualifier Form Language Medium Number statement Name Fullerform Key Version Wakanda Forever Serial or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '710',
            expected:
              'keyword exactPhrase C736762 Radio Hrvatski Location Date work Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '711',
            expected:
              'keyword exactPhrase C736762 Roma Location Date Unit Date Miscellaneous Medium Form Language Number Name Name of meeting Version Title or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '730',
            expected:
              'keyword exactPhrase C736762 Marvel Date work Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '800',
            expected:
              'keyword exactPhrase C736762 Personal Numeration Titles Dates Date information Medium Attribution Form Language Medium Number music Name Fuller Key Version Title of a work or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '810',
            expected:
              'keyword exactPhrase C736762 Corporate Subordinate Location Date Date Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '811',
            expected:
              'keyword exactPhrase C736762 Meeting Location Date Subordinate Date Miscellaneous Medium Form Language Number Name Name Version Title or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '830',
            expected:
              'keyword exactPhrase C736762 Uniform Date Date Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title or identifiers.value exactPhrase nC73676280026955',
          },
        ];

        before('Import records and create user', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C736762*');
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUser) => {
            user = createdUser;

            // Import bib and authority files
            DataImport.uploadFileViaApi(
              testData.bibFile,
              `${testData.bibFile}.${randomPostfix}`,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            ).then((bibResponse) => {
              instanceId = bibResponse[0].instance.id;
            });
            DataImport.uploadFileViaApi(
              testData.authorityFile,
              `${testData.authorityFile}.${randomPostfix}`,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            ).then((authResponse) => {
              authResponse.forEach((authority) => {
                authorityIds.push(authority.authority.id);
              });
            });
          });
        });

        after('Cleanup', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          if (instanceId) {
            InventoryInstance.deleteInstanceViaApi(instanceId);
          }
          authorityIds.forEach((authorityId) => {
            MarcAuthority.deleteViaAPI(authorityId, true);
          });
        });

        it(
          'C736762 Verify all linkable subfields are auto-populated in Select MARC authority modal',
          { tags: ['criticalPath', 'spitfire', 'C736762'] },
          () => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            // Open bib in inventory and edit in QuickMARC
            InventoryInstances.searchByTitle(instanceId);
            InventoryInstances.selectInstanceById(instanceId);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            fieldsAndExpectedQueries.forEach(({ tag, expected }, index) => {
              QuickMarcEditor.clickLinkIconInTagFieldByTag(tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.checkSearchOption(advancedSearchOptionValue);
              MarcAuthorities.checkSearchInput(expected);
              if (index) MarcAuthority.waitLoading();
              InventoryInstance.closeFindAuthorityModal();
            });
          },
        );
      });
    });
  });
});
