import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data for C359199',
        authSearchOption: {
          CORPORATE_NAME: 'Corporate/Conference name',
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC359199.mrc',
            fileName: `testMarcFileBibC359199.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numberOfRecords: 1,
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthC359199_1.mrc',
            fileName: `testMarcFileAuthC359199_1.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
          {
            marc: 'marcAuthC359199_2.mrc',
            fileName: `testMarcFileAuthC359199_2.${randomFourDigitNumber()}.mrc`,
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
        'C359199 MARC Authority plug-in | Apply "Type of heading" facet to the search result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchByParameter(testData.authSearchOption.CORPORATE_NAME, '*');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });
          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[0]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[0],
          });

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[1]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });

          MarcAuthorities.unselectHeadingType(testData.headingTypes[0]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[1],
          });

          MarcAuthorities.resetTypeOfHeading();
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });

          MarcAuthorities.clickResetAndCheck();
        },
      );
    });
  });
});
