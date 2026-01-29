import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
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
          tag240: '240',
          authorityMarcValue:
            'C374112 Conference on Security and Cooperation in Europe (1972-1975 : Helsinki, Finland). Final Act English',
          authorityHeading:
            '$a C374112 Conference on Security and Cooperation in Europe $d (1972-1975 : $c Helsinki, Finland). $t Final Act $l English',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC374112.mrc',
            fileName: `bibFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC374112.mrc',
            fileName: `authFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];
        const bib240InitialFieldValues = [
          11,
          testData.tag240,
          '1',
          '\\',
          '$a Conf on Security & Cooperation in Europe $c H. Finland',
        ];
        const bib240UnlinkedFieldValues = [
          11,
          testData.tag240,
          '1',
          '\\',
          '$a Final Act $d (1972-1975 : $l English $c H. Finland $0 http://id.loc.gov/authorities/names/n88606074',
        ];
        const bib240LinkedFieldValues = [
          11,
          testData.tag240,
          '1',
          '\\',
          '$a Final Act $d (1972-1975 : $l English',
          '$c H. Finland',
          '$0 http://id.loc.gov/authorities/names/n88606074',
          '',
        ];

        before('Create user and import records', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374112*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((user) => {
            testData.user = user;

            marcFiles.forEach((file) => {
              DataImport.uploadFileViaApi(file.marc, file.fileName, file.jobProfileToRun).then(
                (response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record[file.propertyName].id);
                  });
                },
              );
            });

            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20000);
          });
        });

        after('Clean up', () => {
          cy.getAdminToken(() => {
            Users.deleteViaApi(testData.user.userId);
          });
          createdRecordIDs.forEach((id, i) => {
            if (i === 0) InventoryInstance.deleteInstanceViaApi(id);
            else MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C374112 Link the "240" of "MARC Bib" field with "111" field of "MARC Authority" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C374112'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240InitialFieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);

            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.authorityMarcValue);
            MarcAuthorities.checkFieldAndContentExistence('111', testData.authorityHeading);
            MarcAuthorities.clickLinkButton();

            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib240LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.verifyAlternativeTitle(
              0,
              1,
              `${testData.linkedIconText}Final Act (1972-1975 : English`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);

            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickUnlinkIcon(testData.tag240);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240UnlinkedFieldValues);
          },
        );
      });
    });
  });
});
