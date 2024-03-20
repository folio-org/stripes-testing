import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        searchQuery: 'Apple',
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data for C359184',
        authSearchOption: {
          CORPORATE_NAME: 'Corporate/Conference name',
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC359184.mrc',
            fileName: `testMarcFileBibC359184.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC359184_1.mrc',
            fileName: `testMarcFileAuthC359184_1.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 2,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthC359184_2.mrc',
            fileName: `testMarcFileAuthC359184_2.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 3,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthC359184_3.mrc',
            fileName: `testMarcFileAuthC359184_2.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 1,
            propertyName: 'authority',
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
                response.forEach((record) => {
                  if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                    testData.instanceIDs.push(record[marcFile.propertyName].id);
                  } else {
                    testData.authorityIDs.push(record[marcFile.propertyName].id);
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
        'C359184 MARC Authority plug-in | Apply "Type of heading" facet to the browse result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.clickReset();
          MarcAuthorities.searchByParameter(
            testData.authSearchOption.CORPORATE_NAME,
            testData.searchQuery,
          );
          // Need to wait, while data will be updated
          cy.wait(1000);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[1]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[1],
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[1]);

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[0]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[0]);

          MarcAuthorities.enterTypeOfHeading('Personal Name');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading('Personal Name');

          MarcAuthorities.unselectHeadingType(testData.headingTypes[0]);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: [testData.headingTypes[1]],
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[0], false);

          MarcAuthorities.unselectHeadingType(testData.headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[1], false);
          MarcAuthorityBrowse.checkResultWithNoValue(testData.searchQuery);

          MarcAuthorities.resetTypeOfHeading();
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[0], false);
          MarcAuthorities.verifySelectedTypeOfHeadingCount(0);
        },
      );
    });
  });
});
