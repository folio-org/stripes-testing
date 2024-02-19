import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      let userData = {};

      const testData = {
        personalNameSearchOption: 'Personal name',
        uuidSearchOption: 'Authority UUID',
        authorized: 'Authorized',
        searchAuthorityQueries: [
          'Dugmore, C. W. (Clifford William)',
          'Woodson, Jacqueline',
          'Chin, Staceyann, 1972-',
          'Lee, Stan, 1922-2018',
        ],
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC367936_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          title: 'The Journal of ecclesiastical history.',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcBibFileForC367936_2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          title:
            'Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC367936_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          title: 'Dugmore, C. W. (Clifford William)',
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcAuthFileForC367936_2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          title: 'Woodson, Jacqueline',
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcAuthFileForC367936_3.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          title: 'Chin, Staceyann, 1972-',
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcAuthFileForC367936_4.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          title: 'Lee, Stan, 1922-2018',
          propertyName: 'relatedAuthorityInfo',
        },
      ];

      const linkingData = [
        [
          {
            instanceTitle: marcFiles[0].title,
            instanseFieldTag: '700',
            instanseFieldRowIndex: 25,
            authorityFieldTag: '100',
            authorityFieldValue: '$a Dugmore, C. W. $q (Clifford William)',
            authorityTitle: marcFiles[2].title,
          },
          {
            instanceTitle: marcFiles[0].title,
            instanseFieldTag: '700',
            instanseFieldRowIndex: 26,
            authorityFieldTag: '100',
            authorityFieldValue: '$a Woodson, Jacqueline',
            authorityTitle: marcFiles[3].title,
          },
        ],
        [
          {
            instanceTitle: marcFiles[1].title,
            instanseFieldTag: '700',
            instanseFieldRowIndex: 21,
            authorityFieldTag: '100',
            authorityFieldValue: '$a Woodson, Jacqueline',
            authorityTitle: marcFiles[3].title,
          },
          {
            instanceTitle: marcFiles[1].title,
            instanseFieldTag: '100',
            instanseFieldRowIndex: 11,
            authorityFieldTag: '100',
            authorityFieldValue: '$a Chin, Staceyann, $d 1972-',
            authorityTitle: marcFiles[4].title,
          },
          {
            instanceTitle: marcFiles[0].title,
            instanseFieldTag: '700',
            instanseFieldRowIndex: 22,
            authorityFieldTag: '100',
            authorityFieldValue: '$a Chin, Staceyann, $d 1972-',
            authorityTitle: marcFiles[4].title,
          },
        ],
      ];

      const instanceIDs = [];
      const authorityIDs = [];

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          userData = createdUserProperties;

          testData.searchAuthorityQueries.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id);
                });
              }
            });
          });

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                  instanceIDs.push(record[marcFile.propertyName].idList[0]);
                } else {
                  authorityIDs.push(record[marcFile.propertyName].idList[0]);
                }
              });
            });
          });

          cy.loginAsAdmin();
          cy.visit(TopMenu.inventoryPath).then(() => {
            instanceIDs.forEach((instanceRecord, index) => {
              InventoryInstances.searchByTitle(instanceRecord);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              linkingData[index].forEach((record) => {
                InventoryInstance.verifyAndClickLinkIconByIndex(record.instanseFieldRowIndex);
                InventoryInstance.verifySelectMarcAuthorityModal();
                MarcAuthorities.switchToSearch();
                InventoryInstance.searchResults(record.authorityTitle);
                MarcAuthorities.checkFieldAndContentExistence(
                  record.authorityFieldTag,
                  record.authorityFieldValue,
                );
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                  record.instanseFieldTag,
                  record.instanseFieldRowIndex,
                );
                QuickMarcEditor.closeCallout();
              });
              QuickMarcEditor.pressSaveAndClose();
            });
            cy.wait(1000);
          });

          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
        });
      });

      after('Deleting created users, Instances', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C367936 Verify that correct number of linked records are displayed in the "Number of titles" column when browsing for linked "MARC Authority" records (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          MarcAuthorityBrowse.searchBy(testData.personalNameSearchOption, marcFiles[2].title);
          MarcAuthorityBrowse.checkResultWithValue(testData.authorized, marcFiles[2].title);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(marcFiles[2].title, 1);
          MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(marcFiles[2].title, 1);

          InventoryInstance.waitInventoryLoading();
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(marcFiles[0].title, true);
          InventoryInstances.verifySelectedSearchOption(testData.uuidSearchOption);
          InventorySearchAndFilter.checkSearchQueryText(authorityIDs[0]);

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.personalNameSearchOption, marcFiles[3].title);
          MarcAuthorityBrowse.checkResultWithValue(testData.authorized, marcFiles[3].title);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(marcFiles[3].title, 2);
          MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(marcFiles[3].title, 2);

          InventorySearchAndFilter.checkRowsCount(2);
          InventorySearchAndFilter.verifyInstanceDisplayed(marcFiles[0].title, true);
          InventorySearchAndFilter.verifyInstanceDisplayed(marcFiles[1].title, true);

          InventoryInstances.verifySelectedSearchOption(testData.uuidSearchOption);
          InventorySearchAndFilter.checkSearchQueryText(authorityIDs[1]);

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.personalNameSearchOption, marcFiles[4].title);
          MarcAuthorityBrowse.checkResultWithValue(testData.authorized, marcFiles[4].title);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(marcFiles[4].title, 1);

          MarcAuthorityBrowse.searchBy(
            testData.personalNameSearchOption,
            'Dugmore, Clifford William',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            'Dugmore, Clifford William',
          );
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue('Dugmore, Clifford William');

          MarcAuthorityBrowse.searchBy(testData.personalNameSearchOption, marcFiles[5].title);
          MarcAuthorityBrowse.checkResultWithValue(testData.authorized, marcFiles[5].title);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(marcFiles[5].title);
        },
      );
    });
  });
});
