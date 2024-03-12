import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        tags: {
          tag700: '700',
          tag100: '100',
        },
        instanceTitle: 'The data for C360111',
        authTitle: 'Gandhi, Mahatma, 1869-1948',
        authTitleWithoutChar: 'Gandhi, Mahatma, 1869-194',
        authority100FieldValue: '$a Gandhi, $c Mahatma, $d 1869-1948',
        authSourceOptions: {
          NOT_SPECIFIED: 'Not specified',
        },
        authSearchOption: {
          PERSONAL_NAME: 'Personal name',
        },
        absenceMessage:
          'No results found for "Gandhi, Mahatma, 1869-194". Please check your spelling and filters.',
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC360111.mrc',
            fileName: `testMarcFileBib360111.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numberOfRecords: 1,
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthC360111.mrc',
            fileName: `testMarcFileAuthC360111.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
        ],
      };

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${testData.authTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });
        });
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
          .then(() => {
            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                    testData.instanceIDs.push(record[marcFile.propertyName].idList[0]);
                  } else {
                    testData.authorityIDs.push(record[marcFile.propertyName].idList[0]);
                  }
                });
              });
            });
          })
          .then(() => {
            cy.logout();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
          });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C360111 MARC Authority plug-in | Check that no error displays when the user searches by same search option and updated query (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.searchByParameter(
            testData.authSearchOption.PERSONAL_NAME,
            testData.authTitle,
          );
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tags.tag100,
            testData.authority100FieldValue,
          );

          MarcAuthorities.searchByParameter(
            testData.authSearchOption.PERSONAL_NAME,
            testData.authTitleWithoutChar,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.checkNoResultsMessage(testData.absenceMessage);

          MarcAuthorities.searchByParameter(
            testData.authSearchOption.PERSONAL_NAME,
            testData.authTitle,
          );
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tags.tag100,
            testData.authority100FieldValue,
          );
        },
      );
    });
  });
});
