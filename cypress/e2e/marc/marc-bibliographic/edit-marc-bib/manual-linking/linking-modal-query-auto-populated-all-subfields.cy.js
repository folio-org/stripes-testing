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
              'keyword exactPhrase C736762 Clovio, Giulio, 1498-1578 test or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '110',
            expected:
              'keyword exactPhrase C736762 Beatles - Date of meeting or treaty signing test or identifiers.value exactPhrase C73676293094743',
          },
          {
            tag: '111',
            expected:
              'keyword exactPhrase C736762 Stockholm International Film Festival. Date of meeting or treaty signing test or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '130',
            expected:
              'keyword exactPhrase C736762 Marvel comics Date of treaty signing Title of a work or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '240',
            expected:
              'keyword exactPhrase C736762 Fail C736762 PASS (editable) test or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '600',
            expected:
              'keyword exactPhrase C736762 Black Panther Dates associated with a name Wakanda Forever or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '610',
            expected:
              'keyword exactPhrase C736762 Radio Roma. Date of meeting or treaty signing Title of a work or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '611',
            expected:
              'keyword exactPhrase C736762 Roma Council Date Title of a work or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '630',
            expected:
              'keyword exactPhrase C736762 Marvel comics Date of treaty signing Title of a work or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '650',
            expected:
              'keyword exactPhrase C736762 Speaking Oratory Date or identifiers.value exactPhrase shC73676285095298',
          },
          {
            tag: '651',
            expected:
              'keyword exactPhrase C736762 Clear Creek (Tex.) or identifiers.value exactPhrase nC73676279041363',
          },
          {
            tag: '655',
            expected:
              'keyword exactPhrase C736762 Drama or identifiers.value exactPhrase gfC7367622014026297',
          },
          {
            tag: '700',
            expected:
              'keyword exactPhrase C736762 BP Dates Wakanda Forever or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '710',
            expected:
              'keyword exactPhrase C736762 Radio Date Title or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '711',
            expected:
              'keyword exactPhrase C736762 Roma Date Title or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '730',
            expected:
              'keyword exactPhrase C736762 Marvel Date Title or identifiers.value exactPhrase nC73676280026955',
          },
          {
            tag: '800',
            expected:
              'keyword exactPhrase C736762 Personal Dates Title of a work or identifiers.value exactPhrase nC7367622016004082',
          },
          {
            tag: '810',
            expected:
              'keyword exactPhrase C736762 Corporate Date Title or identifiers.value exactPhrase C7367624510955',
          },
          {
            tag: '811',
            expected:
              'keyword exactPhrase C736762 Meeting Date Title or identifiers.value exactPhrase nC73676279084170',
          },
          {
            tag: '830',
            expected:
              'keyword exactPhrase C736762 Uniform Date Title or identifiers.value exactPhrase nC73676280026955',
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
              authRefresh: true,
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
